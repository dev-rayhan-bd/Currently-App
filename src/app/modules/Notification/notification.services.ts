import httpStatus from 'http-status';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { NotificationModel } from './notification.model';


const getMyNotificationsFromDB = async (userId: string, query: Record<string, unknown>) => {
  const notificationQuery = new QueryBuilder(
    NotificationModel.find({ user: userId }), 
    query
  )
    .sort() 
    .paginate()
    .fields();

  const result = await notificationQuery.modelQuery;
  const meta = await notificationQuery.countTotal();

  return { meta, result };
};


const markAllAsReadInDB = async (userId: string) => {
  return await NotificationModel.updateMany(
    { user: userId, isRead: false },
    { $set: { isRead: true } }
  );
};


const markSingleAsReadInDB = async (userId: string, notificationId: string) => {
  const notification = await NotificationModel.findOne({ _id: notificationId, user: userId });
  if (!notification) throw new AppError(httpStatus.NOT_FOUND, "Notification not found!");

  return await NotificationModel.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true }
  );
};

export const NotificationServices = {
  getMyNotificationsFromDB,
  markAllAsReadInDB,
  markSingleAsReadInDB
};