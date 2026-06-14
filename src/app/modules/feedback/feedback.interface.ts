import { Types } from 'mongoose';

export type TFeedbackStatus = 'unread' | 'in-review' | 'resolved';
export type TFeedbackCategory = 'Session' | 'UI' | 'General' | 'Technical';

export interface TFeedback {
  user: Types.ObjectId;
  title: string;
  message: string;
  category: TFeedbackCategory;
  status: TFeedbackStatus;
  isDeleted: boolean;
}