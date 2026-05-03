import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { WaveServices } from "./wave.services";


const createWave = catchAsync(async (req: Request, res: Response) => {
  const result = await WaveServices.createWaveIntoDB(req.user.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Wave created successfully",
    data: result,
  });
});

const getMyWaves = catchAsync(async (req: Request, res: Response) => {
  const result = await WaveServices.getMyWavesFromDB(req.user.userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Waves retrieved successfully",
    data: result,
  });
});

const getSingleWave = catchAsync(async (req: Request, res: Response) => {
  const result = await WaveServices.getSingleWaveFromDB(req.user.userId, req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Wave details retrieved",
    data: result,
  });
});

const updateWave = catchAsync(async (req: Request, res: Response) => {
  const result = await WaveServices.updateWaveInDB(req.user.userId, req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Wave updated successfully",
    data: result,
  });
});

export const WaveControllers = {
  createWave,
  getMyWaves,
  getSingleWave,
  updateWave,
};