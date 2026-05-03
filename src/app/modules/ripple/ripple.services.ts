import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { RippleModel } from "./ripple.model";

import { TRipple } from "./ripple.interface";
import { WaveModel } from "../wave/wave.model";

const createRippleIntoDB = async (userId: string, payload: TRipple) => {
  payload.user = userId as any;
  const result = await RippleModel.create(payload);
  return result;
};

const updateRippleStatusInDB = async (userId: string, rippleId: string, payload: { status: string, timeSpent?: number }) => {
  const ripple = await RippleModel.findOne({ _id: rippleId, user: userId });
  if (!ripple) throw new AppError(httpStatus.NOT_FOUND, "Ripple not found!");

  const oldStatus = ripple.status;
  const newStatus = payload.status;

  const updatedRipple = await RippleModel.findByIdAndUpdate(
    rippleId,
    { status: newStatus, timeSpent: payload.timeSpent || ripple.timeSpent },
    { new: true }
  );


  if (oldStatus !== 'completed' && newStatus === 'completed') {
    await WaveModel.findByIdAndUpdate(ripple.waveId, {
      $inc: { completedRipples: 1 }
    });
  }

  return updatedRipple;
};

const getMyRipplesFromDB = async (userId: string, waveId?: string) => {
  const query: any = { user: userId };
  if (waveId) query.waveId = waveId;
  
  return await RippleModel.find(query).sort({ isPriority: -1, createdAt: 1 });
};

export const RippleServices = {
  createRippleIntoDB,
  updateRippleStatusInDB,
  getMyRipplesFromDB,
};