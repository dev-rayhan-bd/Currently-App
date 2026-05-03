import { z } from "zod";

const createRippleZodSchema = z.object({
  waveId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  duration: z.number().min(1).default(25),
  notes: z.string().optional(),
  isPriority: z.boolean().optional(),
  order: z.number().optional(),
});

const updateRippleZodSchema = z.object({
  title: z.string().optional(),
  status: z.enum(["not-started", "in-progress", "paused", "completed"]).optional(),
  timeSpent: z.number().optional(),
  isPriority: z.boolean().optional(),
  notes: z.string().optional(),
});

export const RippleValidations = {
  createRippleZodSchema,
  updateRippleZodSchema,
};