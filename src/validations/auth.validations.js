import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().max(255).trim(),
  email: z.string().email().toLowerCase().max(255).trim(),
  password: z.string().max(128),
  role: z.enum(['user', 'admin']).default('user'),
});

export const signinSchema = z.object({
  email: z.string().email().toLowerCase().max(255).trim(),
  password: z.string().max(128),
});
