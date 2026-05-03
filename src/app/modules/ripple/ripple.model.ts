import { Schema, model } from "mongoose";
import { TRipple } from "./ripple.interface";

const rippleSchema = new Schema<TRipple>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    waveId: { type: Schema.Types.ObjectId, ref: "Wave" },
    title: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, default: 25 },
    timeSpent: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["not-started", "in-progress", "paused", "completed"],
      default: "not-started",
    },
    order: { type: Number, default: 1 },
    notes: { type: String },
    classroomId: { type: String },
    isPriority: { type: Boolean, default: false },
    completedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Consistency for soft delete
rippleSchema.pre(/^find/, function (this: any) {
  this.where({ isDeleted: { $ne: true } });
});

export const RippleModel = model<TRipple>("Ripple", rippleSchema);