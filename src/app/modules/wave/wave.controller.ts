import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { WaveServices } from './wave.services';
import uploadImage from '../../middleware/upload';


const createWave = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const payload = req.body;


  if (files && files.length > 0) {
    const uploadPromises = files.map(file => uploadImage(req, file));
    payload.files = await Promise.all(uploadPromises);
  }

  const result = await WaveServices.createWaveIntoDB(req.user.userId, payload);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Wave created successfully with attachments',
    data: result,
  });
});
const getAISuggestions = catchAsync(async (req: Request, res: Response) => {
  const result = await WaveServices.getAISuggestionsFromDB(req.user.userId, req.body.waveId, req.body.count);
  sendResponse(res, { statusCode: 200, success: true, message: 'AI Suggestions ready', data: result });
});

const confirmAIPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await WaveServices.confirmAIPlanIntoDB(req.user.userId, req.body.waveId, req.body.ripples);
  sendResponse(res, { statusCode: 201, success: true, message: 'AI Plan confirmed!', data: result });
});
const setupManualRipples = catchAsync(async (req: Request, res: Response) => {
  const { waveId, count, duration } = req.body;
  const result = await WaveServices.setupManualRipplesIntoDB(
    req.user.userId,
    waveId,
    count,
    duration,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${count} Ripples generated successfully`,
    data: result,
  });
});

const getMyWaves = catchAsync(async (req: Request, res: Response) => {
  const result = await WaveServices.getMyWavesFromDB(req.user.userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Waves retrieved successfully',
    data: result,
  });
});

const getSingleWave = catchAsync(async (req: Request, res: Response) => {
  const result = await WaveServices.getSingleWaveFromDB(req.user.userId, req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wave details retrieved successfully',
    data: result,
  });
});

const updateWave = catchAsync(async (req: Request, res: Response) => {
  const result = await WaveServices.updateWaveInDB(req.user.userId, req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wave updated successfully',
    data: result,
  });
});

const deleteWave = catchAsync(async (req: Request, res: Response) => {
  const result = await WaveServices.deleteWaveFromDB(req.user.userId, req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wave and its ripples deleted successfully',
    data: result,
  });
});
const getWaveStats = catchAsync(async (req: Request, res: Response) => {
  const result = await WaveServices.getWaveStatsFromDB(req.user.userId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wave statistics retrieved successfully',
    data: result,
  });
});
export const WaveControllers = {
  createWave,
  setupManualRipples,
  getAISuggestions,
  confirmAIPlan,
  getMyWaves,
  getSingleWave,
  updateWave,
  deleteWave,getWaveStats
};