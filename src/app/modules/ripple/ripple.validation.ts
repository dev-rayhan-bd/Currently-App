import { z } from "zod";

const createRippleZodSchema = z.object({
  waveId: z.string(),
  title: z.string().min(1, "Title is required"),
  duration: z.number().min(1).default(25),
  isPriority: z.boolean().optional(),
});

const updateRippleStatusZodSchema = z.object({
  status: z.enum(["in-progress", "paused", "completed"]),
  timeSpent: z.number().optional(), 
});

export const RippleValidations = {
  createRippleZodSchema,
  updateRippleStatusZodSchema,
};