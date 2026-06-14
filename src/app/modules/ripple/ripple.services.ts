import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { RippleModel } from "./ripple.model";

import QueryBuilder from "../../builder/QueryBuilder";
import { TRipple } from "./ripple.interface";
import { WaveModel } from "../wave/wave.model";
import { Types } from "mongoose";
import moment from 'moment';
import { sendNotification } from "../../utils/sendNotification";


// const createRippleIntoDB = async (userId: string, payload: TRipple) => {
//   payload.user = userId as any;
  
//   const result = await RippleModel.create(payload);
  
 
//   if (payload.waveId) {
//     await WaveModel.findByIdAndUpdate(payload.waveId, { $inc: { totalRipples: 1 } });
//   }
  
//   return result;
// };
const createRippleIntoDB = async (userId: string, payload: any) => {
  const uId = new Types.ObjectId(userId);
  payload.user = uId;

  if (payload.waveId) {
    const wId = new Types.ObjectId(payload.waveId);
    
  
    const currentRippleCount = await RippleModel.countDocuments({ 
      waveId: wId, 
      user: uId, 
      isDeleted: false 
    });

 
    payload.order = currentRippleCount + 1;

    await WaveModel.findByIdAndUpdate(wId, { $inc: { totalRipples: 1 } });
  }

  return await RippleModel.create(payload);
};
const getMyRipplesFromDB = async (userId: string, query: Record<string, unknown>) => {
  const rippleQuery = new QueryBuilder(RippleModel.find({ user: userId }), query)
    .search(["title"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await rippleQuery.modelQuery;
  const meta = await rippleQuery.countTotal();
  return { meta, result };
};

const getSingleRippleFromDB = async (userId: string, id: string) => {
  const result = await RippleModel.findOne({ _id: id, user: userId }).populate('waveId');
  if (!result) throw new AppError(httpStatus.NOT_FOUND, "Ripple not found!");
  return result;
};

const updateRippleInDB = async (userId: string, id: string, payload: Partial<TRipple>) => {
  const ripple = await RippleModel.findOne({ _id: id, user: userId });
  if (!ripple) throw new AppError(httpStatus.NOT_FOUND, "Ripple not found!");


  if (payload.status === 'completed' && ripple.status !== 'completed') {
    payload.completedAt = new Date();
    if (ripple.waveId) {
      await WaveModel.findByIdAndUpdate(ripple.waveId, { $inc: { completedRipples: 1 } });
    }
  }
if (payload.status === 'in-progress') {
  await sendNotification(userId, "Session Started ⏱️", `Focus mode active for: ${ripple.title}`, "ripple");
} 
else if (payload.status === 'paused') {
  await sendNotification(userId, "Session Paused ⏸️", `You paused "${ripple.title}". Don't forget to come back!`, "ripple");
} 
else if (payload.status === 'completed') {
  await sendNotification(userId, "Session Complete! ✨", `Great job! You finished "${ripple.title}".`, "ripple");
}

  const result = await RippleModel.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteRippleFromDB = async (userId: string, id: string) => {
  const ripple = await RippleModel.findOne({ _id: id, user: userId });
  if (!ripple) throw new AppError(httpStatus.NOT_FOUND, "Ripple not found!");

  const result = await RippleModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });


  if (ripple.waveId) {
    await WaveModel.findByIdAndUpdate(ripple.waveId, { $inc: { totalRipples: -1 } });
    if (ripple.status === 'completed') {
      await WaveModel.findByIdAndUpdate(ripple.waveId, { $inc: { completedRipples: -1 } });
    }
  }

  return result;
};


// const getAllRipplesViewFromDB = async (userId: string, query: Record<string, unknown>) => {

//   const uId = new Types.ObjectId(userId);


//   const filter: any = { user: uId, isDeleted: { $ne: true } };
//   if (query.source) {
//     filter.source = query.source;
//   }


//   const stats = await RippleModel.aggregate([
//     { $match: filter },
//     {
//       $facet: {
     
//         "summary": [
//           {
//             $group: {
//               _id: null,
//               total: { $sum: 1 },
//               active: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
//               paused: { $sum: { $cond: [{ $eq: ["$status", "paused"] }, 1, 0] } },
//               done: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
//             },
//           },
//         ],
  
//         "list": [
//           { $sort: { createdAt: -1 } },
//           {
//             $lookup: {
//               from: 'waves',
//               localField: 'waveId',
//               foreignField: '_id',
//               as: 'waveInfo'
//             }
//           },
//           { $unwind: { path: "$waveInfo", preserveNullAndEmptyArrays: true } }
//         ]
//       }
//     }
//   ]);


//   const allRipples = stats[0].list;
//   const groupedData = allRipples.reduce((acc: any, ripple: any) => {
//     const waveName = ripple.waveInfo ? ripple.waveInfo.title : "Standalone Tasks";
//     if (!acc[waveName]) {
//       acc[waveName] = { waveInfo: ripple.waveInfo || null, ripples: [] };
//     }
//     acc[waveName].ripples.push(ripple);
//     return acc;
//   }, {});

//   return {
//     summary: stats[0].summary[0] || { total: 0, active: 0, paused: 0, done: 0 },
//     groupedRipples: Object.keys(groupedData).map(key => ({
//       waveTitle: key,
//       ...groupedData[key]
//     }))
//   };
// };


const getAllRipplesViewFromDB = async (userId: string, query: Record<string, unknown>) => {
  const uId = new Types.ObjectId(userId);

  
  const baseFilter = { user: uId, isDeleted: { $ne: true } };


  const listFilter: any = { ...baseFilter };
  if (query.source) {
    listFilter.source = query.source;
  }

  
  const result = await RippleModel.aggregate([
    { $match: baseFilter }, 
    {
      $facet: {
       
        "globalStats": [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
              paused: { $sum: { $cond: [{ $eq: ["$status", "paused"] }, 1, 0] } },
              done: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            },
          },
        ],
        //(All, Classroom, AI, Manual)
        "sourceCounts": [
          {
            $group: {
              _id: null,
              all: { $sum: 1 },
              classroom: { $sum: { $cond: [{ $eq: ["$source", "google-classroom"] }, 1, 0] } },
              ai: { $sum: { $cond: [{ $eq: ["$source", "ai"] }, 1, 0] } },
              manual: { $sum: { $cond: [{ $eq: ["$source", "manual"] }, 1, 0] } },
            }
          }
        ],
       
        "filteredList": [
          { $match: listFilter }, 
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: 'waves',
              localField: 'waveId',
              foreignField: '_id',
              as: 'waveInfo'
            }
          },
          { $unwind: { path: "$waveInfo", preserveNullAndEmptyArrays: true } }
        ]
      }
    }
  ]);

 
  const globalSummary = result[0].globalStats[0] || { total: 0, active: 0, paused: 0, done: 0 };
  const filterCounts = result[0].sourceCounts[0] || { all: 0, classroom: 0, ai: 0, manual: 0 };
  const allRipples = result[0].filteredList;

  
  const groupedData = allRipples.reduce((acc: any, ripple: any) => {
    const waveName = ripple.waveInfo ? ripple.waveInfo.title : "Standalone Tasks";
    if (!acc[waveName]) {
      acc[waveName] = { waveInfo: ripple.waveInfo || null, ripples: [] };
    }
    acc[waveName].ripples.push(ripple);
    return acc;
  }, {});

  return {
    summary: globalSummary, 
    filterCounts: filterCounts, // (All, Classroom, AI, Manual)
    groupedRipples: Object.keys(groupedData).map(key => ({
      waveTitle: key,
      ...groupedData[key]
    }))
  };
};

const getRippleSessionManagerData = async (userId: string, rippleId: string) => {
  const rId = new Types.ObjectId(rippleId);
  const uId = new Types.ObjectId(userId);

  const result = await RippleModel.aggregate([

    { 
      $match: { _id: rId, user: uId, isDeleted: { $ne: true } } 
    },


    {
      $lookup: {
        from: 'waves', 
        localField: 'waveId',
        foreignField: '_id',
        as: 'waveDetails',
      },
    },
    { $unwind: { path: '$waveDetails', preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: 'ripples',
        let: { currentWaveId: '$waveId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$waveId', '$$currentWaveId'] },
                  { $eq: ['$isDeleted', false] },
                  { $eq: ['$user', uId] }
                ]
              }
            }
          },
          { $sort: { completedAt: -1 } } 
        ],
        as: 'allRelatedRipples',
      },
    },


    {
      $project: {
        _id: 1,
        rippleTitle: '$title',
        waveTitle: { $ifNull: ['$waveDetails.title', 'Standalone Task'] },
        currentSessionTime: '$timeSpent',
        targetDuration: '$duration',
        

        currentFormatted: {
          $concat: [
            { $toString: { $floor: { $divide: ['$timeSpent', 60] } } }, "m ",
            { $toString: { $mod: ['$timeSpent', 60] } }, "s"
          ]
        },


        history: {
          $filter: {
            input: '$allRelatedRipples',
            as: 'ripple',
            cond: { $eq: ['$$ripple.status', 'completed'] }
          }
        },

        // doneSoFar
        doneSoFar: {
          $size: {
            $filter: {
              input: '$allRelatedRipples',
              as: 'ripple',
              cond: { $eq: ['$$ripple.status', 'completed'] }
            }
          }
        },

        // totalTimeSpentOnWave:
        totalTimeSpentOnWave: {
            $floor: { $divide: [{ $sum: '$allRelatedRipples.timeSpent' }, 60] }
        }
      }
    }
  ]);

  if (!result || result.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, "Ripple session not found!");
  }

  return result[0];
};


const getSavedForLaterRipples = async (userId: string, filterType?: string) => {
  const query: any = {
    user: userId,
    status: 'paused',
    isDeleted: { $ne: true },
  };

  const now = new Date();

  if (filterType === 'today') {
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    query.updatedAt = { $gte: startOfToday };
  } 
  else if (filterType === 'thisWeek') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    query.updatedAt = { $gte: sevenDaysAgo };
  } 
  else if (filterType === 'older') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    query.updatedAt = { $lt: sevenDaysAgo };
  }

  return await RippleModel.find(query)
    .populate('waveId', 'title subject')
    .sort({ updatedAt: -1 });
};


const getProgressAnalyticsFromDB = async (userId: string, timeRange: string = '7days') => {
  const uId = new Types.ObjectId(userId);
  const now = new Date();
  let startDate = new Date();


  if (timeRange === '30days') startDate.setDate(now.getDate() - 30);
  else if (timeRange === 'allTime') startDate = new Date(0);
  else startDate.setDate(now.getDate() - 7);

  //  (Streak)
  const completedDates = await RippleModel.distinct('completedAt', {
    user: uId,
    status: 'completed',
    isDeleted: false
  });

  const uniqueSortedDates = [...new Set(completedDates.map(d => new Date(d!).toDateString()))]
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let currentCheckDate = new Date();
  currentCheckDate.setHours(0, 0, 0, 0);

  for (const date of uniqueSortedDates) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === currentCheckDate.getTime()) {
      streak++;
      currentCheckDate.setDate(currentCheckDate.getDate() - 1);
    } else if (d.getTime() > currentCheckDate.getTime()) continue;
    else break;
  }

  // (Aggregation)
  const stats = await RippleModel.aggregate([
    { 
      $match: { 
        user: uId, 
        isDeleted: false, 
        status: 'completed', 
        completedAt: { $gte: startDate } 
      } 
    },
    {
      $facet: {
        "summary": [
          { $group: { _id: null, totalSeconds: { $sum: "$timeSpent" }, totalCount: { $sum: 1 } } }
        ],
        "dailyStats": [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
              seconds: { $sum: "$timeSpent" },
              count: { $sum: 1 }
            }
          },
          { $sort: { "_id": 1 } }
        ],
          "classroomStats": [
          { $match: { source: 'google-classroom' } }, 
          {
            $group: {
              _id: null,
              total: { $sum: 1 }, 
              completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }
            }
          }
        ],
        "subjectStats": [
          { $lookup: { from: 'waves', localField: 'waveId', foreignField: '_id', as: 'w' } },
          { $unwind: "$w" },
          {
            $group: {
              _id: "$w.subject",
              completed: { $sum: 1 },
              total: { $first: "$w.totalRipples" }
            }
          }
        ],
        "recent": [
          { $sort: { completedAt: -1 } },
          { $limit: 3 }

        ]
      }
    }
  ]);

  //(Formatting logic)
  const rawSummary = stats[0].summary[0] || { totalSeconds: 0, totalCount: 0 };
  const totalHours = Math.floor(rawSummary.totalSeconds / 3600);
  const totalMins = Math.floor((rawSummary.totalSeconds % 3600) / 60);


  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
    const found = stats[0].dailyStats.find((d: any) => d._id === date);
    last7Days.push({
      day: moment(date).format('ddd')[0], // M, T, W...
      date: date,
      seconds: found ? found.seconds : 0,
      completed: found ? found.count : 0
    });
  }

  // (AM/PM )
  const formattedRecent = stats[0].recent.map((r: any) => ({
    _id: r._id,
    title: r.title,
    date: moment(r.completedAt).format('MMM D, YYYY'), // Apr 2, 2025
    timeRange: `${moment(r.sessionStartTime || r.createdAt).format('h:mm A')} → ${moment(r.completedAt).format('h:mm A')}`,
    duration: `${Math.round(r.timeSpent / 60)} min`
  }));
  const classroomData = stats[0].classroomStats[0] || { total: 0, completed: 0 };
  

  const classroomPercentage = classroomData.total > 0 
    ? Math.round((classroomData.completed / classroomData.total) * 100) 
    : 0;
  return {
    topCards: {
      focusTime: `${totalHours}h ${totalMins}m`,
      completedCount: rawSummary.totalCount,
      streak: streak
    },
    weeklyComparison: last7Days,
    subjectBreakdown: stats[0].subjectStats.map((s: any) => ({
      subject: s._id,
      text: `${s.completed} of ${s.total} ripples done`,
      percentage: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
    })),
        googleClassroomRate: {
        percentage: classroomPercentage, 
        completed: classroomData.completed, 
        total: classroomData.total, 
        text: `Classroom assignment completion rate: ${classroomPercentage}% ${classroomData.completed} / ${classroomData.total}`
    },
    recentSessions: formattedRecent
  };
}



export const RippleServices = {
  createRippleIntoDB,
  getMyRipplesFromDB,
  getSingleRippleFromDB,
  updateRippleInDB,
  deleteRippleFromDB,
  getAllRipplesViewFromDB,
  getRippleSessionManagerData,
  getSavedForLaterRipples,
  getProgressAnalyticsFromDB
};