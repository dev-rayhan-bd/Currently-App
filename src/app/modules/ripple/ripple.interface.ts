import { Types } from "mongoose";

export type TRippleStatus = 'not-started' | 'in-progress' | 'paused' | 'completed';

export interface TRipple {
  waveId: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  duration: number; // minutes (e.g., 25)
  timeSpent: number; // actual spent time in seconds
  status: TRippleStatus;
  startTime?: Date;
  isPriority: boolean;
  isDeleted: boolean;
}