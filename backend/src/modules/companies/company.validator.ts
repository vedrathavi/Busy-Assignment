import { z } from 'zod';

const websiteSchema = z
  .string()
  .trim()
  .url('Website must be a valid URL (e.g., https://example.com)')
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null));

export const createCompanySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Company name is required')
    .max(255, 'Company name cannot exceed 255 characters'),
  industry: z
    .string()
    .trim()
    .min(1, 'Industry is required')
    .max(100, 'Industry cannot exceed 100 characters'),
  website: websiteSchema,
  ownerId: z.string().uuid('Owner ID must be a valid UUID').optional(),
});

export const updateCompanySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Company name cannot be empty')
      .max(255, 'Company name cannot exceed 255 characters')
      .optional(),
    industry: z
      .string()
      .trim()
      .min(1, 'Industry cannot be empty')
      .max(100, 'Industry cannot exceed 100 characters')
      .optional(),
    website: websiteSchema,
    ownerId: z.string().uuid('Owner ID must be a valid UUID').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const companyQuerySchema = z.object({
  isArchived: z.enum(['false', 'true', 'all']).optional().default('false'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'industry', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const companyIdParamSchema = z.object({
  id: z.string().uuid('Invalid company ID format'),
});

export type CreateCompanySchemaType = z.infer<typeof createCompanySchema>;
export type UpdateCompanySchemaType = z.infer<typeof updateCompanySchema>;
export type CompanyQuerySchemaType = z.infer<typeof companyQuerySchema>;
