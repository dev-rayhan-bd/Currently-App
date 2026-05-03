import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { RippleModel } from "./ripple.model";

import QueryBuilder from "../../builder/QueryBuilder";
import { TRipple } from "./ripple.interface";
import { WaveModel } from "../wave/wave.model";

const createRippleIntoDB = async (userId: string, payload: TRipple) => {
  payload.user = userId as any;
  
  const result = await RippleModel.create(payload);
  
 
  if (payload.waveId) {
    await WaveModel.findByIdAndUpdate(payload.waveId, { $inc: { totalRipples: 1 } });
  }
  
  return result;
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

export const RippleServices = {
  createRippleIntoDB,
  getMyRipplesFromDB,
  getSingleRippleFromDB,
  updateRippleInDB,
  deleteRippleFromDB,
};