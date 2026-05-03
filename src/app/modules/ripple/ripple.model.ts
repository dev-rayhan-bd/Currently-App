import { Schema, model } from "mongoose";
import { TRipple } from "./ripple.interface";

const rippleSchema = new Schema<TRipple>(
  {
    waveId: { type: Schema.Types.ObjectId, ref: "Wave", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, default: 25 },
    timeSpent: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["not-started", "in-progress", "paused", "completed"],
      default: "not-started",
    },
    startTime: { type: Date },
    isPriority: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Soft delete filtering middleware

rippleSchema.pre(/^find/, function (this: any) {
  this.where({ isDeleted: { $ne: true } });
});
export const RippleModel = model<TRipple>("Ripple", rippleSchema);