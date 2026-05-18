import { z } from 'zod';

const createWaveZodSchema = z.object({
  title: z.string().min(1),
  subject: z.string().min(1),
  description: z.string().optional(),
  files: z.array(z.string()).optional(),
  dueDate: z.string().transform((val) => new Date(val)),
  source: z.enum(['manual', 'google-classroom']).optional(),
});

const updateWaveZodSchema = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
  status: z.enum(['active', 'completed', 'paused']).optional(),
  dueDate: z.string().transform((val) => new Date(val)).optional(),
  files: z.array(z.string()).optional(),
});

const manualRippleSetupZodSchema = z.object({
  waveId: z.string(),
  count: z.number().min(1),
  duration: z.number().min(1),
});

export const WaveValidations = {
  createWaveZodSchema,
  updateWaveZodSchema,
  manualRippleSetupZodSchema,
};