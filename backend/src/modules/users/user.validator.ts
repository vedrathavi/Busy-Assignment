import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const userQuerySchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  search: z.string().trim().optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

export type UserQuerySchemaType = z.infer<typeof userQuerySchema>;
export type UserIdParamSchemaType = z.infer<typeof userIdParamSchema>;
