import { FeedbackModel } from './feedback.model';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status'
const createFeedbackIntoDB = async (userId: string, payload: any) => {
  payload.user = userId;
  return await FeedbackModel.create(payload);
};

//  (With QueryBuilder)
const getAllFeedbacksFromDB = async (query: Record<string, unknown>) => {
  const feedbackQuery = new QueryBuilder(
    FeedbackModel.find().populate('user', 'firstName lastName email image'), 
    query
  )
    .search(['title', 'message']) 
    .filter() 
    .sort()
    .paginate()
    .fields();

  const result = await feedbackQuery.modelQuery;
  const meta = await feedbackQuery.countTotal();

  return { meta, result };
};


const updateFeedbackStatusInDB = async (id: string, status: string) => {
  const result = await FeedbackModel.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Feedback not found!");
  }

  return result;
};
export const FeedbackServices = {
  createFeedbackIntoDB,
  getAllFeedbacksFromDB,
  updateFeedbackStatusInDB
};