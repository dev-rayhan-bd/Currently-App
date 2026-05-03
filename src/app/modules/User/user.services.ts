import AppError from "../../errors/AppError";
import { TEditProfile } from "./user.constant";
import httpStatus from 'http-status';
import { UserModel } from "./user.model";
import QueryBuilder from "../../builder/QueryBuilder";

const updateProfileFromDB = async (id: string, payload: TEditProfile) => {
  if (payload.firstName && payload.lastName) {
    payload.fullName = `${payload.firstName} ${payload.lastName}`;
  }
  
  const result = await UserModel.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const getMyProfileFromDB = async (id: string) => {
  const result = await UserModel.findById(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  return result;
};

const getAllUserFromDB = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(UserModel.find(), query);
  queryBuilder.search(["firstName", "lastName", "email", "role"]).filter().sort().paginate();
  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();
  return { meta, result };
};

const blockUserFromDB = async (id: string, status: 'in-progress' | 'blocked') => {
  const result = await UserModel.findByIdAndUpdate(id, { status }, { new: true });
  return result;
};

const deleteUserFromDB = async (id: string) => {
  const result = await UserModel.findByIdAndDelete(id);
  return result;
};

export const UserServices = {
  updateProfileFromDB,
  getMyProfileFromDB,
  getAllUserFromDB,
  blockUserFromDB,
  deleteUserFromDB
};