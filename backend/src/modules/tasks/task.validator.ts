import { z } from 'zod';
import { TaskPriority } from '@prisma/client';

export const dueDateSchema = z
  .string()
  .trim()
  .refine((val) => {
    const match = val.match(/^\d{4}-\d{2}-\d{2}/);
    if (!match) return false;
    const date = new Date(val.includes('T') ? val : `${val}T00:00:00.000Z`);
    return !isNaN(date.getTime());
  }, 'Due date must be a valid calendar date (YYYY-MM-DD)');

export const createTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Task title is required')
      .max(255, 'Task title cannot exceed 255 characters'),
    description: z.string().trim().nullable().optional(),
    priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
    assignedToIds: z
      .array(z.string().uuid('Each Assignee ID must be a valid UUID'))
      .min(1, 'At least one assignee is required')
      .optional(),
    assignedToId: z.string().uuid('Assigned To ID must be a valid UUID').optional(),
    dueDate: dueDateSchema,
  })
  .refine(
    (data) => (data.assignedToIds && data.assignedToIds.length > 0) || Boolean(data.assignedToId),
    {
      message: 'At least one assignee is required',
      path: ['assignedToIds'],
    }
  )
  .transform((data) => {
    const rawIds = data.assignedToIds && data.assignedToIds.length > 0
      ? data.assignedToIds
      : data.assignedToId
      ? [data.assignedToId]
      : [];
    // Deduplicate
    const uniqueIds = Array.from(new Set(rawIds));
    return {
      title: data.title,
      description: data.description,
      priority: data.priority,
      assignedToIds: uniqueIds,
      assignedToId: uniqueIds[0],
      dueDate: data.dueDate,
    };
  });

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Task title cannot be empty')
      .max(255, 'Task title cannot exceed 255 characters')
      .optional(),
    description: z.string().trim().nullable().optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    dueDate: dueDateSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const completeTaskSchema = z.object({
  completionNote: z.string().trim().optional(),
});

export const taskIdParamSchema = z.object({
  id: z.string().uuid('Task ID must be a valid UUID'),
});

export const dealIdParamSchema = z.object({
  dealId: z.string().uuid('Deal ID must be a valid UUID').optional(),
  id: z.string().uuid('Deal ID must be a valid UUID').optional(),
});

export const taskListQuerySchema = z.object({
  dealId: z.string().uuid('Invalid deal ID format').optional(),
  scope: z.enum(['mine', 'assigned_to_me', 'assigned_by_me', 'team']).optional(),
  status: z.enum(['all', 'open', 'completed']).optional(),
  time: z.enum(['all', 'today', 'upcoming', 'overdue']).optional().default('all'),
  priority: z.enum(['all', 'low', 'medium', 'high']).optional().default('all'),
  assignedToId: z.string().uuid('Invalid assignee ID format').optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => !isNaN(val) && val >= 1, 'Page must be >= 1'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
});
