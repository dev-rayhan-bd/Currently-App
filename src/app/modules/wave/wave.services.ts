import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { TWave } from "./wave.interface";
import { WaveModel } from "./wave.model";
import QueryBuilder from "../../builder/QueryBuilder";

const createWaveIntoDB = async (userId: string, payload: TWave) => {
  payload.user = userId as any;
  const result = await WaveModel.create(payload);
  return result;
};

const getMyWavesFromDB = async (userId: string, query: Record<string, unknown>) => {
  const waveQuery = new QueryBuilder(WaveModel.find({ user: userId }), query)
    .search(["title", "subject"])
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
  if (!result) throw new AppError(httpStatus.NOT_FOUND, "Wave not found!");
  return result;
};

const updateWaveInDB = async (userId: string, id: string, payload: Partial<TWave>) => {
  const isOwner = await WaveModel.findOne({ _id: id, user: userId });
  if (!isOwner) throw new AppError(httpStatus.FORBIDDEN, "Access Denied!");

  const result = await WaveModel.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteWaveFromDB = async (userId: string, id: string) => {
  const isOwner = await WaveModel.findOne({ _id: id, user: userId });
  if (!isOwner) throw new AppError(httpStatus.FORBIDDEN, "Access Denied!");

  const result = await WaveModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  return result;
};

export const WaveServices = {
  createWaveIntoDB,
  getMyWavesFromDB,
  getSingleWaveFromDB,
  updateWaveInDB,
  deleteWaveFromDB,
};