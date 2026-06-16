import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { FeedbackServices } from './feedback.services';


const createFeedback = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackServices.createFeedbackIntoDB(req.user.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Feedback submitted successfully',
    data: result,
  });
});

const getAllFeedbacks = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackServices.getAllFeedbacksFromDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Feedbacks retrieved successfully',
    data: result,
  });
});
const updateFeedbackStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const result = await FeedbackServices.updateFeedbackStatusInDB(id as string, status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Feedback status updated successfully',
    data: result,
  });
});


export const FeedbackControllers = {
  createFeedback,
  getAllFeedbacks,updateFeedbackStatus
};