import AppError from "../../errors/AppError";
import { TEditProfile, UserSearchableFields } from "./user.constant";
import httpStatus from 'http-status';
import { UserModel } from "./user.model";
import QueryBuilder from "../../builder/QueryBuilder";
import { WaveModel } from "../wave/wave.model";
import { RippleModel } from "../ripple/ripple.model";
import moment from "moment";
import { Types } from "mongoose";
import { sendNotification } from "../../utils/sendNotification";
import { AdminActivityModel } from "../Admin/admin.activity.model";






const calculateStreak = (completedDates: Date[]): number => {
  if (completedDates.length === 0) return 0;

  const uniqueDates = [
    ...new Set(completedDates.map((d) => new Date(d).toISOString().split('T')[0])),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); 

  let streak = 0;
  let today = new Date();
  let currentDate = new Date(today.toISOString().split('T')[0]);


  const lastCompletedDate = new Date(uniqueDates[0]);
  const diffInDays = Math.floor(
    (currentDate.getTime() - lastCompletedDate.getTime()) / (1000 * 3600 * 24)
  );


  if (diffInDays > 1) return 0;


  let checkDate = lastCompletedDate;

  for (let i = 0; i < uniqueDates.length; i++) {
    const d = new Date(uniqueDates[i]);
    
    if (i === 0) {
      streak++;
    } else {
      const prevDate = new Date(uniqueDates[i - 1]);
      const diff = Math.floor(
        (prevDate.getTime() - d.getTime()) / (1000 * 3600 * 24)
      );

      if (diff === 1) {
        streak++;
      } else {
        break; 
      }
    }
  }

  return streak;
};




const updateProfileFromDB = async (id: string, payload: TEditProfile) => {
  if (payload.firstName && payload.lastName) {
    payload.fullName = `${payload.firstName} ${payload.lastName}`;
  }
  
  const result = await UserModel.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const getMyProfileFromDB = async (userId: string) => {
  const uId = new Types.ObjectId(userId);

  const result = await UserModel.aggregate([
    { $match: { _id: uId } },
    {
      $lookup: {
        from: 'waves',
        localField: '_id',
        foreignField: 'user',
        as: 'waves'
      }
    },
    {
      $lookup: {
        from: 'ripples',
        localField: '_id',
        foreignField: 'user',
        as: 'ripples'
      }
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        fullName: 1,
        image: 1,
        schoolName: 1,
        grade: { $ifNull: ["$grade", "Not set"] },
        email: 1,
        isClassroomConnected: 1,
        lastSyncedAt: 1,
        activeClassesCount: { $ifNull: ["$activeClassesCount", 0] },
        
      
        totalWaves: { $size: { $filter: { input: "$waves", as: "w", cond: { $eq: ["$$w.isDeleted", false] } } } },
        totalRipples: { $size: { $filter: { input: "$ripples", as: "r", cond: { $eq: ["$$r.status", "completed"] } } } },
        

        totalFocusSeconds: { $sum: "$ripples.timeSpent" },
        

        syncedAssignments: { $size: { $filter: { input: "$ripples", as: "r", cond: { $eq: ["$$r.source", "google-classroom"] } } } }
      }
    }
  ]);

  if (!result || result.length === 0) return null;

  const profile = result[0];
    const completedRipples = await RippleModel.find({
    user: uId,
    status: 'completed',
    isDeleted: false
  }).select('completedAt');
 const completedDates = completedRipples
    .map((r) => r.completedAt)
    .filter((d): d is Date => !!d);


  const currentStreak = calculateStreak(completedDates);

  const hours = Math.floor(profile.totalFocusSeconds / 3600);
  
  // 'Last Synced'
  const lastSyncedText = profile.lastSyncedAt 
    ? moment(profile.lastSyncedAt).fromNow() 
    : "Never synced";

  return {
    userInfo: {
      fullName: profile.fullName,
      schoolName: profile.schoolName,
      grade: profile.grade,
      email: profile.email,
      image: profile.image
    },
    stats: {
      waves: profile.totalWaves,
      ripples: profile.totalRipples,
      focus: `${hours}h`,
      streak: currentStreak
    },
    googleClassroom: {
      isConnected: profile.isClassroomConnected,
      activeClasses: profile.activeClassesCount,
      syncedAssignments: profile.syncedAssignments,
      lastSynced: lastSyncedText
    }
  };
};

const getAllUserFromDB = async (query: Record<string, unknown>) => {

  const baseQuery = UserModel.find(); 

  const userQuery = new QueryBuilder(baseQuery, query)
    .search(UserSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();


  if (!result || result.length === 0) {
    return { meta, result: [] };
  }


  const userIds = result.map(user => user._id);
  const sessionStats = await RippleModel.aggregate([
    { $match: { user: { $in: userIds }, status: 'completed', isDeleted: false } },
    { $group: { _id: "$user", completedCount: { $sum: 1 } } }
  ]);

  const finalResult = result.map(user => {
    const userObj = user.toObject();
    const sessionData = sessionStats.find(s => s._id.toString() === user._id.toString());
    return {
      ...userObj,
      sessionCount: sessionData ? sessionData.completedCount : 0
    };
  });

  return { meta, result: finalResult };
};

const blockUserFromDB = async (id: string, status: 'in-progress' | 'blocked',userId:string) => {
  const result = await UserModel.findByIdAndUpdate(id, { status }, { new: true });
  await sendNotification(id, "Account Restricted", "Your account has been blocked by the admin. Contact support for details.", "system");
  if (result) {

    await AdminActivityModel.create({
      admin: userId,
      action: status === 'blocked' ? 'banned user' : 'unbanned user',
      targetUser: `@${result.firstName.toLowerCase()}_${result.lastName.charAt(0).toLowerCase()}`,
      time: new Date()
    });
  }
  return result;
};


const deleteMyAccountFromDB = async (userId: string, password?: string) => {
  const user = await UserModel.findById(userId).select('+password');
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }


  if (user.password && password) {
    const isPasswordMatched = await UserModel.isPasswordMatched(password, user.password);
    if (!isPasswordMatched) {
      throw new AppError(httpStatus.FORBIDDEN, 'Incorrect password! Account deletion failed.');
    }
  }


  await UserModel.findByIdAndUpdate(userId, { isDeleted: true, status: 'blocked' });

  //(Cascading Soft Delete)
  await WaveModel.updateMany({ user: userId }, { isDeleted: true });
  await RippleModel.updateMany({ user: userId }, { isDeleted: true });

  return null;
};

const generateLinkCodeForStudent = async (userId: string) => {
  const student = await UserModel.findById(userId);
  if (!student || student.role !== 'student') {
    throw new AppError(httpStatus.BAD_REQUEST, "Only students can generate a link code");
  }

  // (e.g., 458291)
  const code = Math.floor(100000 + Math.random() * 900000).toString();


  await UserModel.findByIdAndUpdate(userId, {
    linkCode: code,
    linkCodeExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
  });

  return { linkCode: code };
};

const linkStudentToParentByCode = async (parentId: string, code: string) => {

  const student = await UserModel.findOne({
    linkCode: code,
    linkCodeExpires: { $gt: new Date() }, 
    role: 'student'
  });

  if (!student) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid or expired invitation code!");
  }


  const parent = await UserModel.findByIdAndUpdate(
    parentId,
    { $addToSet: { children: student._id } },
    { new: true }
  );
await sendNotification(
  student._id.toString(),
  "Parent Connected 👨‍👩‍👦",
  "Your account has been linked to your parent's portal.",
  "system"
);


await sendNotification(
  parentId,
  "Connection Successful ✅",
  `You are now linked to ${student.firstName}'s account.`,
  "system"
);
  
  await UserModel.findByIdAndUpdate(student._id, {
    linkCode: null,
    linkCodeExpires: null
  });

  return { message: `Successfully linked to ${student.firstName}'s account!` };
};
const getMyChildrenFromDB = async (parentId: string) => {
  const parent = await UserModel.findById(parentId).populate({
    path: 'children',
    select: 'firstName lastName email image schoolName grade isClassroomConnected'
  });
  
  if (!parent) throw new AppError(httpStatus.NOT_FOUND, "Parent not found");
  
  return parent.children;
};

// const getChildDashboardForParentFromDB = async (parentId: string, childId: string) => {
 
//   const parent = await UserModel.findOne({ _id: parentId, children: childId });
//   if (!parent) throw new AppError(httpStatus.FORBIDDEN, "Access denied to this student's data");

//   const uId = new Types.ObjectId(childId);
//   const startOfToday = moment().startOf('day').toDate();
//   const startOfWeek = moment().startOf('isoWeek').toDate(); 
//   const endOfWeek = moment().endOf('isoWeek').toDate();

//   const [child, todayRipples, upcomingWaves, weeklyData, activeWaves, totalCompletedRipples] = await Promise.all([
//     UserModel.findById(childId).select('fullName image lastActiveAt firstName lastName'),
 
//     RippleModel.find({ user: uId, dueDate: { $gte: startOfToday }, isDeleted: false }).sort({ createdAt: 1 }),
    

//     WaveModel.find({ user: uId, status: 'active', isDeleted: false }).sort({ dueDate: 1 }).limit(3),
    
//     // (Aggregation for Bars)
//     RippleModel.aggregate([
//       { 
//         $match: { 
//           user: uId, 
//           dueDate: { $gte: startOfWeek, $lte: endOfWeek },
//           isDeleted: false 
//         } 
//       },
//       {
//         $group: {
//           _id: { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
//           total: { $sum: 1 },
//           completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
//           overdue: { $sum: { $cond: [{ $eq: ["$isOverdue", true] }, 1, 0] } },
//           timeSpent: { $sum: "$timeSpent" }
//         }
//       }
//     ]),


//     WaveModel.find({ user: uId, status: 'active', isDeleted: false }).limit(3),


//     RippleModel.find({ user: uId, status: 'completed', isDeleted: false }).select('completedAt')
//   ]);


//   const weeklyComparison = [];
//   for (let i = 0; i < 7; i++) {
//     const dateStr = moment(startOfWeek).add(i, 'days').format('YYYY-MM-DD');
//     const dayData = weeklyData.find(d => d._id === dateStr);
    
//     let state = "none"; // grey
//     if (dayData) {
//       if (dayData.overdue > 0) state = "behind"; // orange
//       else if (dayData.completed === dayData.total) state = "completed"; // green/blue
//       else if (dayData.total > 0) state = "active"; // light blue
//     }

//     weeklyComparison.push({
//       day: moment(dateStr).format('dd').charAt(0), // M, T, W...
//       date: dateStr,
//       state: state,
//       count: dayData ? dayData.total : 0
//     });
//   }


//   const totalWeekSeconds = weeklyData.reduce((acc, curr) => acc + curr.timeSpent, 0);
//   const totalWeekDone = weeklyData.reduce((acc, curr) => acc + curr.completed, 0);
//   const totalWeekSessions = weeklyData.reduce((acc, curr) => acc + curr.total, 0);
  
//   const todaySeconds = todayRipples.reduce((acc, curr) => acc + curr.timeSpent, 0);
  

//   const streak = calculateStreak(totalCompletedRipples.map(r => r.completedAt!));

//   return {
//     parentName: parent.fullName || `Mr. ${parent.lastName}`,
//     childInfo: {
//       name: child?.fullName,
//       image: child?.image,
//       status: totalWeekDone > 5 ? "Doing great today 🚀" : "On track 🎯",
//       todayStats: {
//         sessions: totalWeekSessions,
//         focusTime: `${Math.floor(todaySeconds / 3600)}h ${Math.floor((todaySeconds % 3600) / 60)}m`,
//         streak: streak
//       }
//     },
//     todaysSessions: todayRipples,
//     upcomingDeadlines: upcomingWaves,
//     thisWeekSnapshot: {
//         markers: weeklyComparison, 
//         totalSessions: totalWeekSessions, // "8 sessions"
//         totalFocusTime: `${Math.floor(totalWeekSeconds / 3600)}h ${Math.floor((totalWeekSeconds % 3600) / 60)}m`, // "3h 20m"
//         ripplesDone: totalWeekDone // "4 ripples done"
//     },
//     activeWaves: activeWaves
//   };
// };



const getChildDashboardForParentFromDB = async (parentId: string, childId: string) => {

  const parent = await UserModel.findOne({ _id: parentId, children: childId });
  if (!parent) throw new AppError(httpStatus.FORBIDDEN, "Access denied to this student's data");

  const uId = new Types.ObjectId(childId);
  const startOfToday = moment().startOf('day').toDate();
  const endOfToday = moment().endOf('day').toDate();
  const startOfWeek = moment().startOf('isoWeek').toDate(); 
  const endOfWeek = moment().endOf('isoWeek').toDate();

  const [child, todayRipples, upcomingWaves, weeklyData, activeWaves, totalCompletedRipples, overdueCount] = await Promise.all([
    UserModel.findById(childId).select('fullName image lastActiveAt firstName lastName'),
 

    RippleModel.find({ user: uId, dueDate: { $gte: startOfToday, $lte: endOfToday }, isDeleted: false }).sort({ createdAt: 1 }),
    
 
    WaveModel.find({ user: uId, status: 'active', isDeleted: false }).sort({ dueDate: 1 }).limit(3),
    

    RippleModel.aggregate([
      { 
        $match: { 
          user: uId, 
          dueDate: { $gte: startOfWeek, $lte: endOfWeek },
          isDeleted: false 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $eq: ["$isOverdue", true] }, 1, 0] } },
          timeSpent: { $sum: "$timeSpent" }
        }
      }
    ]),

    WaveModel.find({ user: uId, status: 'active', isDeleted: false }).limit(3),

    RippleModel.find({ user: uId, status: 'completed', isDeleted: false }).select('completedAt'),


    RippleModel.countDocuments({ user: uId, isOverdue: true, status: { $ne: 'completed' }, isDeleted: false })
  ]);


  const weeklyComparison = [];
  for (let i = 0; i < 7; i++) {
    const dateStr = moment(startOfWeek).add(i, 'days').format('YYYY-MM-DD');
    const dayData = weeklyData.find(d => d._id === dateStr);
    
    let state = "none";
    if (dayData) {
      if (dayData.overdue > 0) state = "behind";
      else if (dayData.completed === dayData.total) state = "completed";
      else if (dayData.total > 0) state = "active";
    }

    weeklyComparison.push({
      day: moment(dateStr).format('dd').charAt(0),
      date: dateStr,
      state: state,
      count: dayData ? dayData.total : 0
    });
  }


  const todayDateStr = moment().format('YYYY-MM-DD');
  const todayStats = weeklyData.find(d => d._id === todayDateStr);
  const todaySeconds = todayStats ? todayStats.timeSpent : 0;

  const totalWeekSeconds = weeklyData.reduce((acc, curr) => acc + curr.timeSpent, 0);
  const totalWeekDone = weeklyData.reduce((acc, curr) => acc + curr.completed, 0);
  const totalWeekSessions = weeklyData.reduce((acc, curr) => acc + curr.total, 0);


  const todayDoneCount = todayRipples.filter(r => r.status === 'completed').length;
  const todayTotalCount = todayRipples.length;

  let dynamicStatus = "Idle today 💤"; 

  if (overdueCount > 0) {
    dynamicStatus = "Falling behind schedule ⚠️";
  } else if (todayTotalCount > 0 && todayDoneCount === todayTotalCount) {
    dynamicStatus = "All tasks completed! 🌟";
  } else if (todayDoneCount > 0) {
    dynamicStatus = "Doing great today 🚀";
  } else if (todayTotalCount > 0) {
    dynamicStatus = "On track 🎯";
  }


  const liveSession = await RippleModel.findOne({ user: uId, status: 'in-progress' }).populate('waveId');

 
  const streak = calculateStreak(totalCompletedRipples.map(r => r.completedAt!));

  return {
    parentName: parent.fullName || `Mr. ${parent.lastName}`,
    childInfo: {
      name: child?.fullName,
      image: child?.image,
      status: dynamicStatus,
      todayStats: {
        sessions: todayTotalCount,
        focusTime: `${Math.floor(todaySeconds / 3600)}h ${Math.floor((todaySeconds % 3600) / 60)}m`,
        streak: streak
      },
      liveActivity: liveSession ? `Started ${moment(liveSession.updatedAt).fromNow()} - ${liveSession.title}` : "No live session"
    },
    todaysSessions: todayRipples,
    upcomingDeadlines: upcomingWaves,
    thisWeekSnapshot: {
        markers: weeklyComparison, 
        totalSessions: totalWeekSessions,
        totalFocusTime: `${Math.floor(totalWeekSeconds / 3600)}h ${Math.floor((totalWeekSeconds % 3600) / 60)}m`,
        ripplesDone: totalWeekDone
    },
    activeWaves: activeWaves
  };
};

// const getChildProgressReportFromDB = async (parentId: string, childId: string) => {

//   const parent = await UserModel.findOne({ _id: parentId, children: childId });
//   if (!parent) throw new AppError(httpStatus.FORBIDDEN, "Access denied");

//   const cId = new Types.ObjectId(childId);
//   const startOfMonth = moment().startOf('month').toDate();
//   const lastMonthStart = moment().subtract(1, 'month').startOf('month').toDate();
//   const lastMonthEnd = moment().subtract(1, 'month').endOf('month').toDate();


//   const report = await RippleModel.aggregate([
//     { $match: { user: cId, isDeleted: false } },
//     {
//       $facet: {

//         "topCards": [
//           { $match: { status: 'completed', completedAt: { $gte: startOfMonth } } },
//           {
//             $group: {
//               _id: null,
//               totalSeconds: { $sum: "$timeSpent" },
//               sessionsDone: { $sum: 1 }
//             }
//           }
//         ],
  
//         "weeklyChart": [
//           { $match: { status: 'completed', completedAt: { $gte: startOfMonth } } },
//           {
//             $group: {
//               _id: { $week: "$completedAt" },
//               totalSeconds: { $sum: "$timeSpent" }
//             }
//           },
//           { $sort: { "_id": 1 } }
//         ],
 
//         "subjectPerformance": [
//           { $lookup: { from: 'waves', localField: 'waveId', foreignField: '_id', as: 'wave' } },
//           { $unwind: "$wave" },
//           {
//             $group: {
//               _id: "$wave.subject",
//               totalSeconds: { $sum: "$timeSpent" },
//               sessions: { $sum: 1 },
//               completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
//               totalRipples: { $first: "$wave.totalRipples" }
//             }
//           }
//         ]
//       }
//     }
//   ]);

//   //  (Waves finished & Streak)
//   const finishedWaves = await WaveModel.countDocuments({ user: cId, status: 'completed', isDeleted: false });
  
//   //(Completion Rate Trend)
//   const currentMonthDone = report[0].topCards[0]?.sessionsDone || 0;


//   const stats = report[0].topCards[0] || { totalSeconds: 0, sessionsDone: 0 };

//   return {
//     summary: {
//       focusTime: `${Math.floor(stats.totalSeconds / 3600)}h ${Math.floor((stats.totalSeconds % 3600) / 60)}m`,
//       sessionsDone: currentMonthDone,
//       tasksFinished: finishedWaves,
//       streak: "5 days" 
//     },
//     weeklyFocusTime: report[0].weeklyChart.map((w: any, index: number) => ({
//       week: `Week ${index + 1}`,
//       hours: parseFloat((w.totalSeconds / 3600).toFixed(1))
//     })),
//     subjectDonut: report[0].subjectPerformance.map((s: any) => ({
//       subject: s._id,
//       percentage: 25,
//       count: s.sessions
//     })),
//     tideProgress: {
//       completionPercentage: 63,
//       wavesDone: finishedWaves,
//       ripplesDone: currentMonthDone,
//       statusText: "On pace with academic calendar"
//     },
//     performanceTable: report[0].subjectPerformance.map((s: any) => ({
//       subject: s._id,
//       timeSpent: `${Math.floor(s.totalSeconds / 3600)}h ${Math.floor((s.totalSeconds % 3600) / 60)}m`,
//       sessions: s.sessions,
//       completionRate: s.sessions > 0 ? Math.round((s.completed / s.sessions) * 100) + "%" : "0%",
//       trend: "up" 
//     }))
//   };
// };



const getChildProgressReportFromDB = async (parentId: string, childId: string) => {
  const parent = await UserModel.findOne({ _id: parentId, children: childId });
  if (!parent) throw new AppError(httpStatus.FORBIDDEN, "Access denied");

  const cId = new Types.ObjectId(childId);
  const now = new Date();
  const startOfMonth = moment().startOf('month').toDate();

  const report = await RippleModel.aggregate([
    { $match: { user: cId, isDeleted: false } },
    {
      $facet: {
  
        "topCards": [
          { $match: { status: 'completed', completedAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: null,
              totalSeconds: { $sum: "$timeSpent" },
              sessionsDone: { $sum: 1 }
            }
          }
        ],

        "weeklyChart": [
          { $match: { status: 'completed', completedAt: { $gte: startOfMonth } } },
          {
            $group: {
              _id: { $week: "$completedAt" },
              totalSeconds: { $sum: "$timeSpent" }
            }
          },
          { $sort: { "_id": 1 } }
        ],
        "subjectPerformance": [
          { $lookup: { from: 'waves', localField: 'waveId', foreignField: '_id', as: 'wave' } },
          { $unwind: { path: "$wave", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: { $ifNull: ["$wave.subject", "General"] },
              totalSeconds: { $sum: "$timeSpent" },
              sessions: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
              totalRipples: { $first: "$wave.totalRipples" }
            }
          }
        ],
   
        "overdueTasks": [
          { $match: { status: { $ne: 'completed' }, dueDate: { $lt: now } } },
          { $lookup: { from: 'waves', localField: 'waveId', foreignField: '_id', as: 'wave' } },
          { $unwind: { path: "$wave", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              title: 1,
              subject: { $ifNull: ["$wave.subject", "General"] },
              dueDate: 1,
              status: "Overdue",
              daysLate: { $floor: { $divide: [{ $subtract: [now, "$dueDate"] }, 1000 * 60 * 60 * 24] } }
            }
          },
          { $sort: { dueDate: 1 } }
        ]
      }
    }
  ]);

  const finishedWaves = await WaveModel.countDocuments({ user: cId, status: 'completed', isDeleted: false });
  const stats = report[0].topCards[0] || { totalSeconds: 0, sessionsDone: 0 };
  const overdueList = report[0].overdueTasks || [];

  return {
    summary: {
      focusTime: `${Math.floor(stats.totalSeconds / 3600)}h ${Math.floor((stats.totalSeconds % 3600) / 60)}m`,
      sessionsDone: stats.sessionsDone,
      tasksFinished: finishedWaves,
      streak: "5 days",

      totalOverdueTasks: overdueList.length,
      alertStatus: overdueList.length > 0 ? "Needs Attention" : "All Good"
    },
    weeklyFocusTime: report[0].weeklyChart.map((w: any, index: number) => ({
      week: `Week ${index + 1}`,
      hours: parseFloat((w.totalSeconds / 3600).toFixed(1))
    })),
    subjectDonut: report[0].subjectPerformance.map((s: any) => ({
      subject: s._id,
      percentage: 25,
      count: s.sessions
    })),
    tideProgress: {
      completionPercentage: 63,
      wavesDone: finishedWaves,
      ripplesDone: stats.sessionsDone,
      statusText: overdueList.length > 0 ? "Falling behind calendar" : "On pace with academic calendar"
    },

    performanceTable: report[0].subjectPerformance.map((s: any) => ({
      subject: s._id,
      timeSpent: `${Math.floor(s.totalSeconds / 3600)}h ${Math.floor((s.totalSeconds % 3600) / 60)}m`,
      sessions: s.sessions,
      completionRate: s.sessions > 0 ? Math.round((s.completed / s.sessions) * 100) + "%" : "0%",
      trend: s.completed > 0 ? "up" : "neutral"
    })),

    overdueAlertsTable: overdueList.map((task: any) => ({
        taskName: task.title,
        subject: task.subject,
        dueDate: moment(task.dueDate).format('MMM DD, YYYY'),
        delay: `${task.daysLate} days late`,
        priority: task.daysLate > 3 ? "High" : "Medium"
    }))
  };
};


const getMyChildrenListFromDB = async (parentId: string) => {

  const parent = await UserModel.findById(parentId).populate('children');
  if (!parent) throw new AppError(httpStatus.NOT_FOUND, "Parent not found");

  const childrenIds = parent.children || [];
  const startOfToday = moment().startOf('day').toDate();
  const startOfWeek = moment().subtract(6, 'days').startOf('day').toDate();

  const childrenData = [];


  for (const child of parent.children as any) {
    const cId = child._id;

    const [todayStats, weeklyData, nextAssignment, totalCompleted] = await Promise.all([

      RippleModel.aggregate([
        { $match: { user: cId, completedAt: { $gte: startOfToday }, isDeleted: false } },
        { $group: { _id: null, count: { $sum: 1 }, time: { $sum: "$timeSpent" } } }
      ]),
  
      RippleModel.aggregate([
        { $match: { user: cId, completedAt: { $gte: startOfWeek }, isDeleted: false } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } }, time: { $sum: "$timeSpent" } } }
      ]),

      WaveModel.findOne({ user: cId, status: 'active', isDeleted: false }).sort({ dueDate: 1 }),

      RippleModel.find({ user: cId, status: 'completed', isDeleted: false }).select('completedAt')
    ]);

    const today = todayStats[0] || { count: 0, time: 0 };
    const streak = calculateStreak(totalCompleted.map(r => r.completedAt!));


    const graph = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
      const found = weeklyData.find(d => d._id === date);
      graph.push({ date, timeSpent: found ? found.time : 0 });
    }

    childrenData.push({
      _id: cId,
      name: child.fullName,
      image: child.image,
      gradeInfo: `${child.grade || 'Grade Not Set'} · ${child.schoolName || 'School Not Set'}`,
      statusTag: today.count > 0 ? "On track" : "At risk",
      statsToday: {
        sessions: today.count,
        focusTime: `${Math.floor(today.time / 3600)}h ${Math.floor((today.time % 3600) / 60)}m`,
        streak: streak
      },
      weeklyGraph: graph,
      nextAssignment: nextAssignment ? {
        title: nextAssignment.title,
        due: moment(nextAssignment.dueDate).fromNow()
      } : null,
      lastActive: child.lastActiveAt ? moment(child.lastActiveAt).fromNow() : "Recently"
    });
  }

  return {
    parentName: parent.fullName,
    totalChildren: childrenData.length,
    children: childrenData
  };
};


const removeChildFromParentFromDB = async (parentId: string, childId: string) => {

  const isLinked = await UserModel.findOne({ _id: parentId, children: childId });
  
  if (!isLinked) {
    throw new AppError(httpStatus.NOT_FOUND, "This child is not linked to your account.");
  }


  const result = await UserModel.findByIdAndUpdate(
    parentId,
    {
      $pull: { children: childId }
    },
    { new: true }
  );

  return result;
};



export const UserServices = {
  updateProfileFromDB,
  getMyProfileFromDB,
  getAllUserFromDB,
  blockUserFromDB,
linkStudentToParentByCode,
generateLinkCodeForStudent,
  deleteMyAccountFromDB,
  getMyChildrenFromDB,
  getChildDashboardForParentFromDB,
  getChildProgressReportFromDB,
  getMyChildrenListFromDB,removeChildFromParentFromDB
};