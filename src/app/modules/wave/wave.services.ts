import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { WaveModel } from './wave.model';

import QueryBuilder from '../../builder/QueryBuilder';
import { RippleModel } from '../ripple/ripple.model';
import { Types } from 'mongoose';
import moment from 'moment';
import { generateRipplesWithAI } from '../../utils/openai.utils';
import { sendNotification } from '../../utils/sendNotification';
import { AdminActivityModel } from '../Admin/admin.activity.model';

const createWaveIntoDB = async (userId: string, payload: any) => {
  payload.user = userId;
  return await WaveModel.create(payload);
};

const getAISuggestionsFromDB = async (userId: string, waveId: string, count?: number) => {
  const wave = await WaveModel.findOne({ _id: waveId, user: userId });
  if (!wave) throw new Error('Wave not found!');


  const suggestions = await generateRipplesWithAI(wave.title, wave.subject, wave.dueDate, count);




  const metadata = {
    totalRipples: suggestions.length,
    avgDuration: Math.round(suggestions.reduce((acc:any, curr:any) => acc + curr.duration, 0) / suggestions.length),
    totalDays: moment(wave.dueDate).diff(moment(), 'days')
  };

  return {

    metadata,
    suggestions
  };
};

// const confirmAIPlanIntoDB = async (userId: string, waveId: string, ripples: any[]) => {
//   const rippleData = ripples.map((item: any, i: number) => ({
//     waveId: new Types.ObjectId(waveId),
//     user: new Types.ObjectId(userId),
//     title: item.title,
//     duration: item.duration,
//     dueDate: new Date(item.date),
//     status: 'not-started',
//     order: i + 1,
//     source: 'ai'
//   }));


//   await RippleModel.deleteMany({ waveId, user: userId });
//   const result = await RippleModel.insertMany(rippleData);

//   await WaveModel.findByIdAndUpdate(waveId, { totalRipples: ripples.length, isAIRipple: true });
//   return result;
// };

const confirmAIPlanIntoDB = async (userId: string, waveId: string, ripples: any[]) => {
  const uId = new Types.ObjectId(userId);
  const wId = new Types.ObjectId(waveId);

  const existingCount = await RippleModel.countDocuments({ 
    waveId: wId, 
    user: uId, 
    isDeleted: false 
  });


  const rippleData = ripples.map((item: any, i: number) => ({
    waveId: wId,
    user: uId,
    title: item.title,
    duration: item.duration,
    dueDate: new Date(item.date),
    status: 'not-started',
    order: existingCount + i + 1,
    source: 'ai'
  }));


  const result = await RippleModel.insertMany(rippleData);


  await WaveModel.findByIdAndUpdate(waveId, { 
    $inc: { totalRipples: ripples.length }, 
    isAIRipple: true 
  });

  return result;
};

const setupManualRipplesIntoDB = async (userId: string, waveId: string, count: number, duration: number,dates?: Date[]) => {
  const uId = new Types.ObjectId(userId);
  const wId = new Types.ObjectId(waveId);

  const wave = await WaveModel.findOne({ _id: wId, user: uId });
  if (!wave) throw new AppError(httpStatus.NOT_FOUND, 'Wave not found!');

  const existingCount = await RippleModel.countDocuments({ waveId: wId, user: uId, isDeleted: false });

 
  const newRipples = Array.from({ length: count }).map((_, i) => ({
    waveId: wId,
    user: uId,
    title: `${wave.title} - Session ${existingCount + i + 1}`,
    duration,
    status: 'not-started',
    order: existingCount + i + 1 ,
    dueDate: dates && dates[i] ? dates[i] : wave.dueDate
  }));

  const result = await RippleModel.insertMany(newRipples);


  await WaveModel.findByIdAndUpdate(wId, { 
    $inc: { totalRipples: count },
    rippleDuration: duration 
  });

  return result;
};
const getMyWavesFromDB = async (userId: string, query: Record<string, unknown>) => {
  const waveQuery = new QueryBuilder(WaveModel.find({ user: userId }), query)
    .search(['title', 'subject'])
    .filter()
    .sort()
    .paginate()
    .fields();
  
  const result = await waveQuery.modelQuery;
  const meta = await waveQuery.countTotal();
  return { meta, result };
};

const getSingleWaveFromDB = async (userId: string, id: string) => {
  const wId = new Types.ObjectId(id);
  const uId = new Types.ObjectId(userId);


  const wave = await WaveModel.findOne({ _id: wId, user: uId });
  if (!wave) throw new AppError(httpStatus.NOT_FOUND, "Wave not found!");


  const actualRippleCount = await RippleModel.countDocuments({ 
    waveId: wId, 
    user: uId, 
    isDeleted: false 
  });


  const actualCompletedCount = await RippleModel.countDocuments({ 
    waveId: wId, 
    user: uId, 
    status: 'completed',
    isDeleted: false 
  });


  const ripples = await RippleModel.find({ 
    waveId: wId, 
    user: uId, 
    isDeleted: false 
  }).sort({ order: 1 });

 
  const progressPercentage = actualRippleCount > 0 
    ? Math.round((actualCompletedCount / actualRippleCount) * 100) 
    : 0;

  wave.totalRipples = actualRippleCount;
  wave.completedRipples = actualCompletedCount;
  await wave.save();

  return {
    wave,
    ripples,
    progressPercentage
  };
};
const updateWaveInDB = async (userId: string, id: string, payload: any) => {
 
  const result = await WaveModel.findOneAndUpdate(
    { _id: id, user: userId }, 
    payload, 
    { new: true }
  );


  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Wave not found or unauthorized!');
  }


  if (payload.status === 'completed') {
    await sendNotification(
      userId, 
      "Wave Accomplished! 🌊", 
      `Congratulations! You've officially finished the project: ${result.title}`, 
      "wave"
    );
  }

  return result;
};

const deleteWaveFromDB = async (userId: string, id: string) => {
  const result = await WaveModel.findOneAndUpdate({ _id: id, user: userId }, { isDeleted: true }, { new: true });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Wave not found!');
  
  // Cascading soft delete for ripples
  await RippleModel.updateMany({ waveId: id }, { isDeleted: true });
    if (result) {
    await AdminActivityModel.create({
      admin: userId,
      action: 'deleted a wave',
      targetUser: result.title,
      time: new Date()
    });
  }
  return result;
};



const getWaveStatsFromDB = async (userId: string) => {
  const startOfToday = moment().startOf('day').toDate();
  const endOfToday = moment().endOf('day').toDate();

  
  const [activeWavesCount, ripplesTodayCount] = await Promise.all([
    WaveModel.countDocuments({ user: userId, status: 'active', isDeleted: false }),
    RippleModel.countDocuments({ 
      user: userId, 
      status: { $ne: 'completed' },
      dueDate: { $gte: startOfToday, $lte: endOfToday } 
    })
  ]);

  const allWaves = await WaveModel.find({ user: userId, isDeleted: false }).sort({ createdAt: -1 });


  const formattedWaves = {
    inProgress: allWaves.filter(w => w.completedRipples > 0 && w.completedRipples < w.totalRipples),
    notStarted: allWaves.filter(w => w.completedRipples === 0),
    completed: allWaves.filter(w => w.completedRipples >= w.totalRipples && w.totalRipples > 0)
  };

  return {
    summary: {
      activeWaves: activeWavesCount,
      ripplesToday: ripplesTodayCount,
    },
    waves: formattedWaves
  };
};

export const WaveServices = {
  createWaveIntoDB,
  setupManualRipplesIntoDB,
  getMyWavesFromDB,
  getSingleWaveFromDB,
  updateWaveInDB,
  deleteWaveFromDB,
  getWaveStatsFromDB,
  getAISuggestionsFromDB,
  confirmAIPlanIntoDB
};