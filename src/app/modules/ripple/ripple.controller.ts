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

const updateRippleStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await RippleServices.updateRippleStatusInDB(
    req.user.userId,
    req.params.id as string, 
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ripple status updated",
    data: result,
  });
});

const getMyRipples = catchAsync(async (req: Request, res: Response) => {
  const { waveId } = req.query;
  const result = await RippleServices.getMyRipplesFromDB(req.user.userId, waveId as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Ripples retrieved successfully",
    data: result,
  });
});

export const RippleControllers = {
  createRipple,
  updateRippleStatus,
  getMyRipples,
};