import { z } from 'zod';
import { ROLES } from './roles';

export const registerSchema = z.object({
  email: z.email().trim().toLowerCase(),
  name: z.string().trim().min(2).max(50),
  password: z.string().min(8).max(128),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const noteCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(10_000).default(''),
});
export type NoteCreateInput = z.infer<typeof noteCreateSchema>;

export const noteUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    content: z.string().max(10_000),
    done: z.boolean(),
  })
  .partial();
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;

export const updateRoleSchema = z.object({ role: z.enum(ROLES) });
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const chatMessageSchema = z.object({
  room: z.string().trim().min(1).max(40),
  text: z.string().trim().min(1).max(2000),
});

export const CHAT_ROOMS = ['general', 'random', 'dev'] as const;
