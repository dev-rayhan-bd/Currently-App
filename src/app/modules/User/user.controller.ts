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
  const userId=req.user.userId
  const result = await UserServices.blockUserFromDB(id as string, status,userId as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User status updated to ${status}`,
    data: result,
  });
});
const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  const { password } = req.body; 
  await UserServices.deleteMyAccountFromDB(req.user.userId, password);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your account and all associated data have been deleted.',
    data: null,
  });
});

const generateLinkCode = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await UserServices.generateLinkCodeForStudent(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Link code generated successfully! Valid for 10 minutes.',
    data: result,
  });
});


const linkChildByCode = catchAsync(async (req: Request, res: Response) => {
  const parentId = req.user.userId;
  const { code } = req.body;

  const result = await UserServices.linkStudentToParentByCode(parentId, code);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});


const getMyChildren = catchAsync(async (req: Request, res: Response) => {
  const parentId = req.user.userId;
  const result = await UserServices.getMyChildrenFromDB(parentId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Children list retrieved successfully',
    data: result,
  });
});

const getChildDashboard = catchAsync(async (req: Request, res: Response) => {
  const parentId = req.user.userId;
  const { childId } = req.params;

  const result = await UserServices.getChildDashboardForParentFromDB(parentId as string, childId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Child's dashboard data retrieved successfully",
    data: result,
  });
});
const getChildProgressReport = catchAsync(async (req: Request, res: Response) => {
  const parentId = req.user.userId;
  const { childId } = req.params;

  const result = await UserServices.getChildProgressReportFromDB(parentId, childId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Child progress report retrieved successfully",
    data: result,
  });
});
const getMyChildrenList = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.getMyChildrenListFromDB(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Children list with performance stats retrieved',
    data: result,
  });
});

const removeChild = catchAsync(async (req: Request, res: Response) => {
  const parentId = req.user.userId;
  const { childId } = req.params;

  await UserServices.removeChildFromParentFromDB(parentId, childId as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Child removed from your account successfully',
    data: null,
  });
});



export const UserControllers = {
  updateProfile,
  getMyProfile,
  getAllUsers,
  toggleBlockStatus,
  deleteMyAccount,
  generateLinkCode,
  linkChildByCode,
  getMyChildren,
  getChildDashboard,
  getChildProgressReport,
  getMyChildrenList,removeChild
};