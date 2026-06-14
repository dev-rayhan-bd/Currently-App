import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { DashboardServices } from './dashboard.services';


const getDashboardSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardServices.getDashboardSummaryFromDB(req.user.userId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard data retrieved successfully',
    data: result,
  });
});

export const DashboardControllers = {
  getDashboardSummary,
};