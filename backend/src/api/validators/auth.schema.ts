import { z } from 'zod';

export const registerSchema = z.object({
  userId: z
    .string()
    .min(8, 'User ID must be at least 8 characters')
    .max(20, 'User ID must be at most 20 characters')
    .regex(/[A-Z]/, 'User ID must contain at least one uppercase letter')
    .regex(/[0-9]/, 'User ID must contain at least one number'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string().min(1).max(50).optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'User ID or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const verify2faSchema = z.object({
  tempToken: z.string().min(1, 'tempToken is required'),
  code:      z.string().min(1, 'code is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

export const resetPasswordSchema = z.object({
  token:    z.string().min(1, 'token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterBody     = z.infer<typeof registerSchema>;
export type LoginBody        = z.infer<typeof loginSchema>;
export type Verify2faBody    = z.infer<typeof verify2faSchema>;
export type ForgotPassBody   = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
