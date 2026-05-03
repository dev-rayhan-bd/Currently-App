import { Request, Response } from "express";
import { UserServices } from "./user.services";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import uploadImage from "../../middleware/upload";

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const id = req?.user?.userId;
  let imageUrl: string | undefined;

  if (req.file) {
    imageUrl = await uploadImage(req);
  }

  const payload = { ...req.body, image: imageUrl || undefined };
  const result = await UserServices.updateProfileFromDB(id, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.getMyProfileFromDB(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile retrieved successfully!",
    data: result,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.getAllUserFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully!",
    data: result,
  });
});

const toggleBlockStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await UserServices.blockUserFromDB(id as string, status);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User status updated to ${status}`,
    data: result,
  });
});

export const UserControllers = {
  updateProfile,
  getMyProfile,
  getAllUsers,
  toggleBlockStatus
};