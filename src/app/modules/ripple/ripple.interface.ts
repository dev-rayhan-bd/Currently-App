import { Types } from "mongoose";

export type TRippleStatus = 'not-started' | 'in-progress' | 'paused' | 'completed';

export interface TRipple {
  user: Types.ObjectId;
  waveId?: Types.ObjectId; 
  title: string;
  duration: number; // minutes
  timeSpent: number; // seconds
  status: TRippleStatus;
  order: number; 
  notes?: string; 
  classroomId?: string; 
  isPriority: boolean;
  completedAt?: Date; 
  isDeleted: boolean;
}