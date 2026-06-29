import { z } from 'zod';

export const sighupSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  email: z.email().min(1).toLowerCase().max(255).trim(),
  password: z.string.min(7).max(128),
  role: z.enum(['user', 'admin']).default('user'),
});

export const signinSchema = z.object({
  email: z.email().min(1).toLowerCase().max(255).trim(),
  password: z.string.min(7).max(128),
});
