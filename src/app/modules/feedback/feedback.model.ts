import { Schema, model } from 'mongoose';
import { TFeedback } from './feedback.interface';

const feedbackSchema = new Schema<TFeedback>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['Session', 'UI', 'General', 'Technical'], 
      default: 'General' 
    },
    status: { 
      type: String, 
      enum: ['unread', 'in-review', 'resolved'], 
      default: 'unread' 
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

feedbackSchema.pre(/^find/, function (this: any) {
  this.where({ isDeleted: { $ne: true } });
});

export const FeedbackModel = model<TFeedback>('Feedback', feedbackSchema);