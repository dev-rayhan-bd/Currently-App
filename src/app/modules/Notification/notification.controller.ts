import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { NotificationModel } from './notification.model';
import AppError from '../../errors/AppError';



const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;


  const notifications = await NotificationModel.find({ user: userId })
    .sort({ createdAt: -1 }) 
    .skip(skip)
    .limit(limit);


  const total = await NotificationModel.countDocuments({ user: userId });
  const totalPages = Math.ceil(total / limit);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    data: {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    },
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  
  await NotificationModel.updateMany(
    { user: userId, isRead: false },
    { isRead: true }
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications marked as read',
    data: null,
  });
});

const markSingleAsRead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params; 
  const userId = req.user.userId;

  const result = await NotificationModel.findOneAndUpdate(
    { _id: id, user: userId },
    { isRead: true },
    { new: true }
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});


export const NotificationController = { getMyNotifications, markAsRead,markSingleAsRead };