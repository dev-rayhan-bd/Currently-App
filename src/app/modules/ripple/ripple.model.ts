import { Schema, model } from "mongoose";
import { TRipple } from "./ripple.interface";

const rippleSchema = new Schema<TRipple>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true }, //
    waveId: { type: Schema.Types.ObjectId, ref: "Wave" },
    title: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, default: 25 },
    timeSpent: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["not-started", "in-progress", "paused", "completed"],
      default: "not-started",
    },
      source: { 
      type: String, 
      enum: ['manual', 'google-classroom', 'ai'], 
      default: 'manual' 
    },
    order: { type: Number, default: 1 },
    notes: { type: String },
      dueDate: { type: Date },
      sessionHistory: [
  {
    startTime: { type: Date },
    duration: { type: Number }
  }
],
  isPriority: { type: Boolean, default: false },
  isOverdue: { type: Boolean, default: false }, 
    classroomId: { type: String },

    completedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    googleAssignmentId: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Consistency for soft delete
rippleSchema.pre(/^find/, function (this: any) {
  this.where({ isDeleted: { $ne: true } });
});

export const RippleModel = model<TRipple>("Ripple", rippleSchema);