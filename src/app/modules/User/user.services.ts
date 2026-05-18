import AppError from "../../errors/AppError";
import { TEditProfile, UserSearchableFields } from "./user.constant";
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

  const baseQuery = UserModel.find({ 
    role: { $nin: ['admin', 'superAdmin'] } 
  });

  const userQuery = new QueryBuilder(baseQuery, query)
    .search(UserSearchableFields) // firstName, email 
    .filter()  // role=student / status=active 
    .sort()    // sort=-createdAt /sort=firstName
    .paginate()// page=1&limit=10
    .fields(); // fields=firstName,email 

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

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