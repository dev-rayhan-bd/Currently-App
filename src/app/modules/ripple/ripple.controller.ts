import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { RippleServices } from "./ripple.services";


const createRipple = catchAsync(async (req: Request, res: Response) => {
  const result = await RippleServices.createRippleIntoDB(req.user.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Ripple created successfully",
    data: result,
  });
});

const getMyRipples = catchAsync(async (req: Request, res: Response) => {
  const result = await RippleServices.getMyRipplesFromDB(req.user.userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ripples retrieved successfully",
    data: result,
  });
});

const getSingleRipple = catchAsync(async (req: Request, res: Response) => {
  const result = await RippleServices.getSingleRippleFromDB(req.user.userId, req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ripple details retrieved",
    data: result,
  });
});

const updateRipple = catchAsync(async (req: Request, res: Response) => {
  const result = await RippleServices.updateRippleInDB(req.user.userId, req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ripple updated successfully",
    data: result,
  });
});

const deleteRipple = catchAsync(async (req: Request, res: Response) => {
  const result = await RippleServices.deleteRippleFromDB(req.user.userId, req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ripple deleted successfully",
    data: result,
  });
});
const getAllRipplesView = catchAsync(async (req: Request, res: Response) => {
  const result = await RippleServices.getAllRipplesViewFromDB(req.user.userId, req.query);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All Ripples view data retrieved successfully',
    data: result,
  });
});
const getRippleSessionManager = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params; //  rippleId
  const userId = req.user.userId;

  const result = await RippleServices.getRippleSessionManagerData(userId, id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Ripple session manager data retrieved successfully',
    data: result,
  });
});
const getSavedForLater = catchAsync(async (req: Request, res: Response) => {
  const { filter } = req.query; // Today, ThisWeek, Older
  const result = await RippleServices.getSavedForLaterRipples(
    req.user.userId, 
    filter as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Saved for later ripples retrieved successfully',
    data: result,
  });
});
const getProgressAnalytics = catchAsync(async (req: Request, res: Response) => {
  const { range } = req.query; // 7days, 30days, allTime
  const result = await RippleServices.getProgressAnalyticsFromDB(req.user.userId, range as string);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Progress analytics retrieved successfully',
    data: result,
  });
});
export const RippleControllers = {
  createRipple,
  getMyRipples,
  getSingleRipple,
  updateRipple,
  deleteRipple,
  getAllRipplesView,
  getRippleSessionManager,
  getSavedForLater,
  getProgressAnalytics
};