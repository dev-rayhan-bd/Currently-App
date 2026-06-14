import { Schema, model, Types } from 'mongoose';

const notificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['order', 'birthday', 'promo', 'general','catering'], 
    default: 'general' 
  },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

export const NotificationModel = model('Notification', notificationSchema);