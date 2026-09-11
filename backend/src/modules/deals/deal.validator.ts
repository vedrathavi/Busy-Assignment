import { z } from 'zod';
import { DealStage } from '@prisma/client';

export const decimalValueSchema = z
  .string()
  .trim()
  .regex(
    /^\d{1,12}(\.\d{1,2})?$/,
    'Value must be a valid positive currency amount with up to 2 decimal places (e.g., "125000.50")'
  )
  .refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Deal value must be strictly positive (greater than 0)');

export const calendarDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected close date must be in YYYY-MM-DD format')
  .refine((val) => {
    const date = new Date(`${val}T00:00:00.000Z`);
    return !isNaN(date.getTime());
  }, 'Expected close date must be a valid calendar date');

export const createDealSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Deal title is required')
    .max(255, 'Deal title cannot exceed 255 characters'),
  companyId: z.string().uuid('Company ID must be a valid UUID'),
  value: decimalValueSchema,
  expectedCloseDate: calendarDateSchema,
  ownerId: z.string().uuid('Owner ID must be a valid UUID').optional(),
});

export const updateDealSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Deal title cannot be empty')
      .max(255, 'Deal title cannot exceed 255 characters')
      .optional(),
    companyId: z.string().uuid('Company ID must be a valid UUID').optional(),
    value: decimalValueSchema.optional(),
    expectedCloseDate: calendarDateSchema.optional(),
    ownerId: z.string().uuid('Owner ID must be a valid UUID').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const transitionStageSchema = z.object({
  stage: z.nativeEnum(DealStage),
  reason: z.string().trim().optional(),
});

export const dealQuerySchema = z
  .object({
    stage: z
      .nativeEnum(DealStage, {
        errorMap: () => ({ message: 'Invalid deal stage' }),
      })
      .optional(),
    ownerId: z.string().uuid('Invalid owner ID format').optional(),
    companyId: z.string().uuid('Invalid company ID format').optional(),
    search: z.string().trim().optional(),
    page: z.coerce
      .number({ invalid_type_error: 'Page must be a number' })
      .int('Page must be an integer')
      .min(1, 'Page must be at least 1')
      .default(1),
    pageSize: z.coerce
      .number({ invalid_type_error: 'Page size must be a number' })
      .int('Page size must be an integer')
      .min(1, 'Page size must be at least 1')
      .max(100, 'Page size cannot exceed 100')
      .optional(),
    limit: z.coerce
      .number({ invalid_type_error: 'Limit must be a number' })
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .optional(),
    sortBy: z
      .enum(['value', 'expectedCloseDate', 'updatedAt'], {
        errorMap: () => ({
          message: 'Invalid sortBy field. Supported fields: value, expectedCloseDate, updatedAt',
        }),
      })
      .default('updatedAt'),
    sortOrder: z
      .enum(['asc', 'desc'], {
        errorMap: () => ({ message: 'Invalid sortOrder. Supported values: asc, desc' }),
      })
      .default('desc'),
  })
  .transform((data) => {
    const effectivePageSize = data.pageSize ?? data.limit ?? 20;
    return {
      ...data,
      pageSize: effectivePageSize,
      limit: effectivePageSize,
    };
  });

export const dealIdParamSchema = z.object({
  id: z.string().uuid('Invalid deal ID format'),
});

export const addCollaboratorSchema = z.object({
  userId: z.string().uuid('Invalid collaborator user ID format'),
});

export const collaboratorUserParamSchema = z.object({
  id: z.string().uuid('Invalid deal ID format'),
  userId: z.string().uuid('Invalid collaborator user ID format'),
});

export const addNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, 'Note content cannot be empty')
    .max(5000, 'Note content cannot exceed 5000 characters'),
});

export const bulkReassignSchema = z.object({
  dealIds: z
    .array(z.string().uuid('Each deal ID must be a valid UUID'))
    .min(1, 'At least one deal ID is required')
    .max(100, 'Maximum batch size is 100 deals')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Duplicate deal IDs are not allowed in the request',
    }),
  ownerId: z.string().uuid('Owner ID must be a valid UUID'),
});

export const bulkAdvanceSchema = z.object({
  dealIds: z
    .array(z.string().uuid('Each deal ID must be a valid UUID'))
    .min(1, 'At least one deal ID is required')
    .max(100, 'Maximum batch size is 100 deals')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Duplicate deal IDs are not allowed in the request',
    }),
});

export type CreateDealSchemaType = z.infer<typeof createDealSchema>;
export type UpdateDealSchemaType = z.infer<typeof updateDealSchema>;
export type TransitionStageSchemaType = z.infer<typeof transitionStageSchema>;
export type DealQuerySchemaType = z.infer<typeof dealQuerySchema>;
export type AddCollaboratorSchemaType = z.infer<typeof addCollaboratorSchema>;
export type CollaboratorUserParamSchemaType = z.infer<typeof collaboratorUserParamSchema>;
export type AddNoteSchemaType = z.infer<typeof addNoteSchema>;
export type BulkReassignSchemaType = z.infer<typeof bulkReassignSchema>;
export type BulkAdvanceSchemaType = z.infer<typeof bulkAdvanceSchema>;
