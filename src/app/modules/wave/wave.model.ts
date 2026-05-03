import { Schema, model } from "mongoose";
import { TWave } from "./wave.interface";

const waveSchema = new Schema<TWave>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    totalRipples: { type: Number, required: true, min: 1 },
    completedRipples: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "completed", "paused"],
      default: "active",
    },
    source: {
      type: String,
      enum: ["manual", "google-classroom"],
      default: "manual",
    },
    classroomId: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Query middleware to exclude deleted waves
waveSchema.pre('find', function () {
  this.where({ isDeleted: { $ne: true } });
});

waveSchema.pre('findOne', function () {
  this.where({ isDeleted: { $ne: true } });
});
// waveSchema.post('findOneAndUpdate', async function (doc) {

//   if (doc && doc.isDeleted === true) {
//     await RippleModel.updateMany(
//       { waveId: doc._id }, 
//       { $set: { isDeleted: true } } 
//     );
//     console.log(`Associated ripples for wave ${doc._id} are also soft deleted.`);
//   }
// });
export const WaveModel = model<TWave>("Wave", waveSchema);