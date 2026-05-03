import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { WaveModel } from './wave.model';

import QueryBuilder from '../../builder/QueryBuilder';
import { RippleModel } from '../ripple/ripple.model';

const createWaveIntoDB = async (userId: string, payload: any) => {
  payload.user = userId;
  return await WaveModel.create(payload);
};

const setupManualRipplesIntoDB = async (userId: string, waveId: string, count: number, duration: number) => {
  const wave = await WaveModel.findOne({ _id: waveId, user: userId });
  if (!wave) throw new AppError(httpStatus.NOT_FOUND, 'Wave not found!');

  const ripples = Array.from({ length: count }).map((_, i) => ({
    waveId,
    user: userId,
    title: `${wave.title} - Session ${i + 1}`,
    duration,
    status: 'not-started',
  }));

  const result = await RippleModel.insertMany(ripples);
  await WaveModel.findByIdAndUpdate(waveId, { totalRipples: count });
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
  const result = await WaveModel.findOne({ _id: id, user: userId });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Wave not found!');
  return result;
};

const updateWaveInDB = async (userId: string, id: string, payload: any) => {
  const result = await WaveModel.findOneAndUpdate({ _id: id, user: userId }, payload, { new: true });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Wave not found or unauthorized!');
  return result;
};

const deleteWaveFromDB = async (userId: string, id: string) => {
  const result = await WaveModel.findOneAndUpdate({ _id: id, user: userId }, { isDeleted: true }, { new: true });
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Wave not found!');
  
  // Cascading soft delete for ripples
  await RippleModel.updateMany({ waveId: id }, { isDeleted: true });
  return result;
};

export const WaveServices = {
  createWaveIntoDB,
  setupManualRipplesIntoDB,
  getMyWavesFromDB,
  getSingleWaveFromDB,
  updateWaveInDB,
  deleteWaveFromDB,
};