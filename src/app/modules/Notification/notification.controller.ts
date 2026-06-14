import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { NotificationServices } from './notification.services';

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationServices.getMyNotificationsFromDB(req.user.userId, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  await NotificationServices.markAllAsReadInDB(req.user.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications marked as read',
    data: null,
  });
});

const markSingleAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationServices.markSingleAsReadInDB(req.user.userId, req.params.id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

export const NotificationControllers = {
  getMyNotifications,
  markAllAsRead,
  markSingleAsRead
};