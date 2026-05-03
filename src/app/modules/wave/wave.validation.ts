import { z } from "zod";

const createWaveZodSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional(),
  dueDate: z.string().transform((str) => new Date(str)),
  totalRipples: z.number().min(1, "At least 1 ripple is required"),
  source: z.enum(["manual", "google-classroom"]).optional(),
});

const updateWaveZodSchema = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
  status: z.enum(["active", "completed", "paused"]).optional(),
  totalRipples: z.number().optional(),
});

export const WaveValidations = {
  createWaveZodSchema,
  updateWaveZodSchema,
};