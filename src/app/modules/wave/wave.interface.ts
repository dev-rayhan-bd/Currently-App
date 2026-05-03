import { Types } from "mongoose";

export type TWaveStatus = 'active' | 'completed' | 'paused';
export type TWaveSource = 'manual' | 'google-classroom';

export interface TWave {
  user: Types.ObjectId;
  title: string;
  subject: string;
  description?: string;
  dueDate: Date;
  totalRipples: number; 
  completedRipples: number;
  status: TWaveStatus;
  source: TWaveSource;
  classroomId?: string; 
  isDeleted: boolean;
}