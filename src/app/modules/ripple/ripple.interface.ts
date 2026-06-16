import { Types } from "mongoose";

export type TRippleStatus = 'not-started' | 'in-progress' | 'paused' | 'completed';
export interface ISessionLog {
  startTime: Date;
  duration: number; 
}
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
 dueDate?: Date;
 sessionHistory: ISessionLog[]; 
  isOverdue: boolean; 
  source?: 'manual' | 'google-classroom' | 'ai'; 
  completedAt?: Date; 
  isDeleted: boolean;
  googleAssignmentId?: string;
   createdAt?: Date; 
  updatedAt?: Date;
}