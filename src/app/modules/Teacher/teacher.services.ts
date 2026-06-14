import { Types } from 'mongoose';
import { UserModel } from '../User/user.model';
import { RippleModel } from '../ripple/ripple.model';
import { WaveModel } from '../wave/wave.model';
import moment from 'moment';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { sendNotification } from '../../utils/sendNotification';
import * as ExcelJS from 'exceljs';

const getDashboardSummaryFromDB = async (teacherId: string) => {
  const teacher = await UserModel.findById(teacherId);
  if (!teacher) throw new AppError(httpStatus.NOT_FOUND, "Teacher not found");

  const teacherClassIds = teacher.teacherClasses || [];
  if (teacherClassIds.length === 0) {
    return { message: "Teacher has no assigned classes.", stats: {}, studentTable: [], upcomingDeadlines: [], snapshot: {} };
  }

  // --- TIMEZONE & TIME RANGE SETUP (UTC) ---
  const todayStart = moment.utc().startOf('day').toDate();
  const todayEnd = moment.utc().endOf('day').toDate();
  const yesterdayStart = moment.utc().subtract(1, 'days').startOf('day').toDate();
  const yesterdayEnd = moment.utc().subtract(1, 'days').endOf('day').toDate();
  

  const activeThreshold = moment.utc().subtract(30, 'minutes').toDate();
  const activeThresholdYesterday = moment.utc().subtract(1, 'days').subtract(30, 'minutes').toDate();


  const myStudentIds = await WaveModel.distinct('user', { 
    classroomId: { $in: teacherClassIds }, 
    isDeleted: false 
  });


  const [
    activeNowCount, activeYesterdayCount,
    completedTodayCount, completedYesterdayCount,
    deadlinesThisWeekCount, deadlinesTomorrowCount
  ] = await Promise.all([
    // Active Now 
    UserModel.countDocuments({ 
      _id: { $in: myStudentIds }, 
      lastActiveAt: { $gte: activeThreshold }, 
      isDeleted: false 
    }),
    UserModel.countDocuments({ 
      _id: { $in: myStudentIds }, 
      lastActiveAt: { $gte: activeThresholdYesterday, $lt: yesterdayEnd }, 
      isDeleted: false 
    }),

    RippleModel.countDocuments({ 
      classroomId: { $in: teacherClassIds }, 
      status: 'completed', 
      completedAt: { $gte: todayStart } 
    }),

    RippleModel.countDocuments({ 
      classroomId: { $in: teacherClassIds }, 
      status: 'completed', 
      completedAt: { $gte: yesterdayStart, $lt: yesterdayEnd } 
    }),
  
    WaveModel.countDocuments({ 
      classroomId: { $in: teacherClassIds }, 
      dueDate: { $gte: todayStart, $lte: moment.utc().endOf('week').toDate() }, 
      isDeleted: false 
    }),
  
    WaveModel.countDocuments({ 
      classroomId: { $in: teacherClassIds }, 
      dueDate: { $gte: moment.utc().add(1, 'day').startOf('day').toDate(), $lte: moment.utc().add(1, 'day').endOf('day').toDate() }, 
      isDeleted: false 
    })
  ]);


  const studentStats = await WaveModel.aggregate([
    { $match: { classroomId: { $in: teacherClassIds }, isDeleted: false } },
    {
      $group: {
        _id: "$user",
        totalRipples: { $sum: "$totalRipples" },
        completedTotal: { $sum: "$completedRipples" },
        isBehind: { $max: { $cond: ["$isOverdue", 1, 0] } },
        lastSubject: { $first: "$subject" }
      }
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: "$user" },
    {
      $lookup: {
        from: 'ripples',
        let: { studentId: "$_id" },
        pipeline: [
          { 
            $match: { 
              $expr: { 
                $and: [
                  { $eq: ["$user", "$$studentId"] },
                  { $in: ["$classroomId", teacherClassIds] },
                  { $gte: ["$updatedAt", todayStart] }
                ]
              } 
            } 
          },
          { $sort: { updatedAt: -1 } }
        ],
        as: 'todaysRipples'
      }
    }
  ]);

  const studentTable = studentStats.map(s => {
    const ripplesToday = s.todaysRipples || [];
    const completedToday = ripplesToday.filter((r: any) => r.status === 'completed').length;
    const activeRipple = ripplesToday.find((r: any) => r.status === 'in-progress');

    let status = 'onTrack';
    const progressPercent = s.totalRipples > 0 ? (s.completedTotal / s.totalRipples) * 100 : 0;
    
    if (s.isBehind === 1) status = 'behind';
    else if (progressPercent < 40) status = 'atRisk';
    else if (progressPercent === 0) status = 'notStarted';

    // Activity Text 
    let activityText = "No session today";
    if (activeRipple) {
      activityText = `Working on Ripple ${activeRipple.order || 1} — ${s.lastSubject}`;
    } else if (completedToday > 0) {
      activityText = `${completedToday} sessions completed`;
    }

    return {
      id: s._id,
      name: s.user.fullName,
      handle: `@${s.user.firstName.toLowerCase()}_${s.user.lastName[0].toLowerCase()}`,
      image: s.user.image || "",
      initials: (s.user.firstName[0] + s.user.lastName[0]).toUpperCase(),
      status,
      activityText,
      progressText: `${s.completedTotal}/${s.totalRipples} ripples`
    };
  });

  // (Ratio & RatioText)
  const wavesForDeadlines = await WaveModel.aggregate([
    { $match: { classroomId: { $in: teacherClassIds }, isDeleted: false, dueDate: { $gte: todayStart } } },
    {
      $group: {
        _id: "$googleAssignmentId",
        title: { $first: "$title" },
        subject: { $first: "$subject" },
        dueDate: { $first: "$dueDate" },
        totalStudents: { $sum: 1 },
        doneStudents: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        sumTotalRipples: { $sum: "$totalRipples" },
        sumDoneRipples: { $sum: "$completedRipples" }
      }
    },
    { $sort: { dueDate: 1 } },
    { $limit: 3 }
  ]);

  const upcomingDeadlines = wavesForDeadlines.map(w => ({
    title: w.title,
    subject: `${w.subject} - Period ${Math.floor(Math.random() * 4) + 1}`,
    dueDate: moment.utc(w.dueDate).isSame(moment.utc(), 'day') ? 'DUE TODAY' : moment.utc(w.dueDate).format('MMM DD'),
    progress: w.sumTotalRipples > 0 ? Math.round((w.sumDoneRipples / w.sumTotalRipples) * 100) : 0,
    ratioText: `${w.doneStudents} of ${w.totalStudents} done`
  }));
 const liveLogs = await RippleModel.find({ 
    user: { $in: myStudentIds }, 
    isDeleted: false,
    updatedAt: { $gte: todayStart }
  })
    .sort({ updatedAt: -1 }) 
    .limit(5)
    .populate('user', 'fullName');

  const liveActivity = liveLogs.map(log => {
    let actionText = '';
    if (log.status === 'completed') {
      actionText = `completed a session`;
    } else if (log.status === 'in-progress') {
      actionText = `started a session`;
    } else if (log.status === 'paused') {
      actionText = `paused a session`;
    } else {
      actionText = `updated a session`;
    }

    return {
      time: moment(log.updatedAt).format('HH:mm'),
      userHandle: `@${(log.user as any)?.fullName?.toLowerCase().replace(/\s/g, '_') || 'student'}`,
      action: `${actionText} for ${log.title}`
    };
  });
  // (Focus Time & Charts)
  const currentWeekRipples = await RippleModel.find({ 
    classroomId: { $in: teacherClassIds }, 
    status: 'completed', 
    completedAt: { $gte: moment.utc().startOf('isoWeek').toDate() } 
  });
  
  const totalSeconds = currentWeekRipples.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0);
  const avgMins = currentWeekRipples.length > 0 ? Math.round((totalSeconds / currentWeekRipples.length) / 60) : 0;

  const chartData = ['M', 'T', 'W', 'T', 'F'].map((day, i) => {
    const d = moment.utc().startOf('isoWeek').add(i, 'days').format('YYYY-MM-DD');
    return { day, value: currentWeekRipples.filter(r => moment.utc(r.completedAt).format('YYYY-MM-DD') === d).length };
  });

  return {
    stats: {
      activeNow: { value: activeNowCount, growth: `${activeNowCount - activeYesterdayCount >= 0 ? '+' : ''}${activeNowCount - activeYesterdayCount} vs yesterday` },
      completedToday: { value: completedTodayCount, growth: `${completedTodayCount - completedYesterdayCount >= 0 ? '+' : ''}${completedTodayCount - completedYesterdayCount} vs yesterday` },
      studentsBehind: { value: studentTable.filter(s => s.status === 'behind').length, growth: "0 vs yesterday" },
      deadlinesThisWeek: { value: deadlinesThisWeekCount, subText: `${deadlinesTomorrowCount} due tomorrow` }
    },
    statusSummary: {
      onTrack: studentTable.filter(s => s.status === 'onTrack').length,
      atRisk: studentTable.filter(s => s.status === 'atRisk').length,
      behind: studentTable.filter(s => s.status === 'behind').length,
      notStarted: studentTable.filter(s => s.status === 'notStarted').length,
    },
    studentTable,
    upcomingDeadlines,
    liveActivity,
    snapshot: {
      chartData,
      avgSessionTime: `${avgMins}m`,
      completionRate: upcomingDeadlines.length > 0 ? Math.round(upcomingDeadlines.reduce((a, b) => a + b.progress, 0) / upcomingDeadlines.length) : 0
    }
  };
};


const getMyClassesFromDB = async (teacherId: string) => {
  const teacher = await UserModel.findById(teacherId);
  if (!teacher) throw new AppError(httpStatus.NOT_FOUND, "Teacher not found");


  const teacherClassIds = teacher.teacherClasses || [];

  if (teacherClassIds.length === 0) {
    return {
      headerStats: { totalClasses: 0, totalStudents: 0 },
      classes: []
    };
  }

  const classesData = await WaveModel.aggregate([
    { 
      $match: { 
        classroomId: { $in: teacherClassIds }, 
        isDeleted: false 
      } 
    },
    {
      $group: {
        _id: "$classroomId",
        className: { $first: "$subject" }, 
        period: { $first: "$description" }, 
        uniqueStudents: { $addToSet: "$user" }, 
        totalAssignments: { $sum: 1 },
        sumCompleted: { $sum: "$completedRipples" },
        sumTotal: { $sum: "$totalRipples" },
        lastUpdated: { $max: "$updatedAt" }
      }
    },
    {
      $project: {
        _id: 1,
        className: 1,
        period: { $ifNull: ["$period", "Period 1 • Grade 10"] },
        studentCount: { $size: "$uniqueStudents" },
        assignmentCount: "$totalAssignments",
        lastUpdated: 1,
        avgCompletion: {
          $cond: [
            { $gt: ["$sumTotal", 0] },
            { $round: [{ $multiply: [{ $divide: ["$sumCompleted", "$sumTotal"] }, 100] }, 0] },
            0
          ]
        }
      }
    },
    { $sort: { className: 1 } }
  ]);


  const totalStudentsCount = classesData.reduce((acc, curr) => acc + curr.studentCount, 0);

  return {
    headerStats: {
      totalClasses: classesData.length,
      totalStudents: totalStudentsCount
    },
    classes: classesData
  };
};

const getClassDetailFromDB = async (classId: string) => {

  const assignmentsHeader = await WaveModel.find({ classroomId: classId, isDeleted: false })
    .select('title dueDate')
    .sort({ dueDate: 1 })
    .limit(4); 

  const assignmentTitles = assignmentsHeader.map(a => a.title);


  const studentGrid = await WaveModel.aggregate([
    { $match: { classroomId: classId, isDeleted: false } },
    {
      $group: {
        _id: "$user",
        assignments: {
          $push: {
            title: "$title",
            completed: "$completedRipples",
            total: "$totalRipples",
            status: "$status",
            isOverdue: "$isOverdue",
            lastUpdated: "$updatedAt"
          }
        },
        totalWaves: { $sum: 1 },
        totalDoneWaves: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'studentInfo'
      }
    },
    { $unwind: "$studentInfo" },
    {
      $project: {
        _id: 1,
        name: "$studentInfo.fullName",
        handle: { $concat: ["@", { $arrayElemAt: [{ $split: ["$studentInfo.email", "@"] }, 0] }] },
        image: "$studentInfo.image",
        assignments: 1,
        overallProgress: {
          $cond: [{ $gt: ["$totalWaves", 0] }, { $round: [{ $multiply: [{ $divide: ["$totalDoneWaves", "$totalWaves"] }, 100] }, 0] }, 0]
        },
        progressText: { $concat: [{ $toString: "$totalDoneWaves" }, "/", { $toString: "$totalWaves" }, " complete"] }
      }
    }
  ]);

  const totalStudents = studentGrid.length;
  const needAttention = studentGrid.filter(s => s.overallProgress < 50).length;

  return {
    classInfo: {
      totalStudents,
      assignmentCount: assignmentsHeader.length,
      avgCompletion: "68%", 
      needAttentionCount: needAttention
    },
    assignmentsHeader, 
    students: studentGrid   
  };
};


const sendRemindersToStudentsFromDB = async (teacherId: string, studentIds: string[]) => {
  const teacher = await UserModel.findById(teacherId);
  
  const notificationPromises = studentIds.map(sId => 
    sendNotification(
      sId,
      "Teacher's Reminder ⚠️",
      `Mr/Ms. ${teacher?.lastName} noticed you're falling behind. Time to complete a Ripple!`,
      "reminder"
    )
  );

  await Promise.all(notificationPromises);
  return { message: "Reminders sent successfully" };
};


const getStudentsNeedingAttentionFromDB = async (teacherId: string, classId: string) => {
  const result = await WaveModel.aggregate([

    { $match: { classroomId: classId, isDeleted: false } },
    

    {
      $group: {
        _id: "$user",
        totalWaves: { $sum: 1 },
        completedWaves: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        behindCount: { $sum: { $cond: [{ $eq: ["$isOverdue", true] }, 1, 0] } },
        totalRipples: { $sum: "$totalRipples" },
        completedRipples: { $sum: "$completedRipples" }
      }
    },


    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'studentInfo'
      }
    },
    { $unwind: "$studentInfo" },

    // "Needs Attention" 
    // jodi kuno assignment overdue thake or progress 50% er kom hoy
    {
      $addFields: {
        progressPercentage: {
          $cond: [{ $gt: ["$totalRipples", 0] }, { $multiply: [{ $divide: ["$completedRipples", "$totalRipples"] }, 100] }, 0]
        }
      }
    },
    {
      $match: {
        $or: [
          { behindCount: { $gt: 0 } },
          { progressPercentage: { $lt: 50 } }
        ]
      }
    },


    {
      $project: {
        studentId: "$_id",
        name: "$studentInfo.fullName",
        image: "$studentInfo.image",
        email: "$studentInfo.email",
        alertText: { $concat: ["Behind on ", { $toString: "$behindCount" }, " assignments"] }
      }
    }
  ]);

  return result;
};


const getAssignmentsOverviewFromDB = async (teacherId: string) => {
  const teacher = await UserModel.findById(teacherId);
  const classIds = teacher?.teacherClasses || [];

  if (classIds.length === 0) return { message: "No classes found", stats: {}, assignments: [] };

  const now = new Date();


  const assignmentsData = await WaveModel.aggregate([
    { 
      $match: { 
        classroomId: { $in: classIds }, 
        isDeleted: false 
      } 
    },
    {
      $group: {
        _id: "$googleAssignmentId", 
        title: { $first: "$title" },
        subject: { $first: "$subject" },
        dueDate: { $first: "$dueDate" },
        source: { $first: "$source" },
        totalStudentsAssigned: { $sum: 1 },
        totalRipplesAcrossStudents: { $sum: "$totalRipples" },
        completedRipplesAcrossStudents: { $sum: "$completedRipples" },
        isOverdue: { $first: "$isOverdue" }
      }
    },
    {
      $lookup: {
        from: 'ripples',
        let: { assignmentId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ["$googleAssignmentId", "$$assignmentId"] }, { $eq: ["$isDeleted", false] }] } } },
          {
            $group: {
              _id: null,
              notStarted: { $sum: { $cond: [{ $eq: ["$status", "not-started"] }, 1, 0] } },
              inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
              completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
              behind: { $sum: { $cond: [{ $eq: ["$isOverdue", true] }, 1, 0] } }
            }
          }
        ],
        as: 'rippleStats'
      }
    },
    { $unwind: { path: "$rippleStats", preserveNullAndEmptyArrays: true } }
  ]);

  // (Header Stats)
  const totalAssignments = assignmentsData.length;
  const overdueAssignments = assignmentsData.filter(a => new Date(a.dueDate) < now).length;
  
  let totalAllRipples = 0;
  let totalAllDone = 0;
  let totalBehindStudents = 0;

  assignmentsData.forEach(a => {
    totalAllRipples += a.totalRipplesAcrossStudents;
    totalAllDone += a.completedRipplesAcrossStudents;
    if (a.rippleStats?.behind > 0) totalBehindStudents += 1;
  });

  const avgCompletion = totalAllRipples > 0 ? Math.round((totalAllDone / totalAllRipples) * 100) : 0;


const today = moment().startOf('day');
const tomorrow = moment().add(1, 'day').startOf('day');

const formattedAssignments = assignmentsData.map(a => {
  const due = moment(a.dueDate);
  let dueDateStatus = "";
  let statusType = "normal"; 


  if (due.isBefore(today, 'day')) {
    dueDateStatus = `Overdue • ${due.format('MMM D')}`;
    statusType = "overdue";
  } else if (due.isSame(today, 'day')) {
    dueDateStatus = "Due TODAY";
    statusType = "today"; 
  } else if (due.isSame(tomorrow, 'day')) {
    dueDateStatus = `Due tomorrow, ${due.format('MMM D')}`;
    statusType = "tomorrow"; 
  } else {
    dueDateStatus = `Due ${due.format('MMM D')}`;
    statusType = "upcoming"; 
  }

  return {
    id: a._id,
    title: a.title,
    subject: a.subject,
    dueDateStatus, // (e.g. Due TODAY)
    statusType,    // (overdue, today, upcoming)
    progress: a.totalRipplesAcrossStudents > 0 
      ? Math.round((a.completedRipplesAcrossStudents / a.totalRipplesAcrossStudents) * 100) 
      : 0,
    breakdown: {
      completed: a.rippleStats?.completed || 0,
      inProgress: a.rippleStats?.inProgress || 0,
      notStarted: a.rippleStats?.notStarted || 0,
      behind: a.rippleStats?.behind || 0
    }
  };
});


  
  return {
    headerStats: {
      totalAssignments,
      avgCompletion: `${avgCompletion}%`,
      overdueCount: overdueAssignments,
      studentsBehind: totalBehindStudents
    },
    alertBanner: {
      overdueAssignmentsCount: overdueAssignments,
      totalStudentsImpacted: totalBehindStudents
    },
    // assignments: assignmentsData.map(a => ({
    //   id: a._id,
    //   title: a.title,
    //   subject: a.subject,
    //   dueDateText: moment(a.dueDate).format('MMM D'),
    //   status: new Date(a.dueDate) < now ? "Overdue" : "On track",
    //   progress: a.totalRipplesAcrossStudents > 0 ? Math.round((a.completedRipplesAcrossStudents / a.totalRipplesAcrossStudents) * 100) : 0,
    //   breakdown: {
    //     completed: a.rippleStats?.completed || 0,
    //     inProgress: a.rippleStats?.inProgress || 0,
    //     notStarted: a.rippleStats?.notStarted || 0,
    //     behind: a.rippleStats?.behind || 0
    //   }
    // }))
    assignments: formattedAssignments
  };
};


const getExportReportDataFromDB = async (classroomId: string) => {

  const reportData = await WaveModel.aggregate([
    { $match: { classroomId: classroomId, isDeleted: false } },
    {
      $group: {
        _id: "$user",
        totalWaves: { $sum: 1 },
        totalDone: { $sum: "$completedRipples" },
        totalRipples: { $sum: "$totalRipples" }
      }
    },
    {
      $lookup: {
        from: 'users', 
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: "$userInfo" }
  ]);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Class Performance');


  worksheet.columns = [
    { key: 'name', width: 30 },
    { key: 'email', width: 35 },
    { key: 'waves', width: 15 },
    { key: 'progress', width: 25 },
    { key: 'percentage', width: 20 },
  ];

  // (Row 1)
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'CURRENTLY - Student Performance Report';
  titleCell.font = { name: 'Arial Black', size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 40;

  //  (Row 2)
  worksheet.mergeCells('A2:E2');
  const dateCell = worksheet.getCell('A2');
  dateCell.value = `Report Generated on: ${new Date().toLocaleString()}`;
  dateCell.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
  dateCell.alignment = { horizontal: 'right' };
  worksheet.getRow(2).height = 20;

  // (Row 3)
  const headerRow = worksheet.getRow(3);
  headerRow.values = ['STUDENT NAME', 'EMAIL ADDRESS', 'WAVES', 'RIPPLES (DONE/TOTAL)', 'COMPLETION %'];
  
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }; // Primary Blue
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  headerRow.height = 25;

  reportData.forEach((item, index) => {
    const percentageNum = item.totalRipples > 0 ? Math.round((item.totalDone / item.totalRipples) * 100) : 0;
    
    const row = worksheet.addRow({
      name: item.userInfo.fullName,
      email: item.userInfo.email,
      waves: item.totalWaves,
      progress: `${item.totalDone} / ${item.totalRipples}`,
      percentage: `${percentageNum}%`
    });

    // (Zebra Stripes)
    const rowColor = index % 2 === 0 ? 'FFF1F5F9' : 'FFFFFFFF';
    
    row.eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      if (colNumber === 5 && percentageNum === 100) {
        cell.font = { color: { argb: 'FF10B981' }, bold: true };
      }
    });
    row.height = 20;
  });

  return workbook;
};

const sendClassReminderFromDB = async (teacherId: string, classroomId: string) => {
  const teacher = await UserModel.findById(teacherId);


  const pendingStudents = await RippleModel.distinct('user', {
    classroomId: classroomId,
    status: { $ne: 'completed' },
    isDeleted: false
  });

  if (pendingStudents.length === 0) {
    return { message: "No students need reminders right now." };
  }


  const notificationPromises = pendingStudents.map(sId => 
    sendNotification(
      sId.toString(),
      "Classroom Update 📚",
      `Mr/Ms. ${teacher?.lastName} sent a reminder for your active assignments. Let's finish them!`,
      "reminder"
    )
  );

  await Promise.all(notificationPromises);
  return { message: `Reminders sent to ${pendingStudents.length} students.` };
};

const getTeacherProfileStatsFromDB = async (teacherId: string) => {
  const teacher = await UserModel.findById(teacherId);
  if (!teacher) throw new Error("Teacher not found");

  const classIds = teacher.teacherClasses || [];

  // ১. এগ্রিগেশন: টিচারের আন্ডারে থাকা সব স্টুডেন্টের ডাটা থেকে স্ট্যাটস বের করা
  const teachingStats = await WaveModel.aggregate([
    { 
      $match: { 
        classroomId: { $in: classIds }, 
        isDeleted: false 
      } 
    },
    {
      $group: {
        _id: null,
        totalStudents: { $addToSet: "$user" }, // ইউনিক স্টুডেন্ট আইডি
        totalAssignments: { $sum: 1 },
        totalCompletedRipples: { $sum: "$completedRipples" },
        totalRipples: { $sum: "$totalRipples" }
      }
    },
    {
      $project: {
        _id: 0,
        studentCount: { $size: "$totalStudents" },
        assignmentCount: "$totalAssignments",
        avgCompletion: {
          $cond: [
            { $gt: ["$totalRipples", 0] },
            { $round: [{ $multiply: [{ $divide: ["$totalCompletedRipples", "$totalRipples"] }, 100] }, 0] },
            0
          ]
        }
      }
    }
  ]);

  const stats = teachingStats[0] || { studentCount: 0, assignmentCount: 0, avgCompletion: 0 };

  return {
    profile: {
      fullName: teacher.fullName,
      email: teacher.email,
      image: teacher.image,
      schoolName: teacher.schoolName || "Lincoln High School",
      role: teacher.role
    },
    teachingStats: {
      totalStudents: stats.studentCount,
      activeClasses: classIds.length,
      assignmentsCreated: stats.assignmentCount,
      avgClassCompletion: `${stats.avgCompletion}%`,
      accountCreated: moment(teacher.createdAt).format('MMM DD, YYYY') // e.g. Jan 15, 2026
    }
  };
};
export const TeacherServices = {
  getDashboardSummaryFromDB,
  getMyClassesFromDB, 
  getClassDetailFromDB,
  sendRemindersToStudentsFromDB,
  getStudentsNeedingAttentionFromDB,
  getAssignmentsOverviewFromDB,
  getExportReportDataFromDB,
  sendClassReminderFromDB,
  getTeacherProfileStatsFromDB
};