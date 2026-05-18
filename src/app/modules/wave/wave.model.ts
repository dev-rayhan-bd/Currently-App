import { Schema, model } from 'mongoose';
import { TWave } from './wave.interface';

const waveSchema = new Schema<TWave>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    files: { type: [String], default: [] },
    totalRipples: { type: Number, default: 0 },
    completedRipples: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
    source: { type: String, enum: ['manual', 'google-classroom'], default: 'manual' },
    classroomId: { type: String },
    isAIRipple: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

waveSchema.pre(/^find/, function (this: any) {
  this.where({ isDeleted: { $ne: true } });
});

export const WaveModel = model<TWave>('Wave', waveSchema);