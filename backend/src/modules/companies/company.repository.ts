import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AuthUser } from '../auth/auth.types';
import { companyPolicy } from './company.policy';
import {
  CompanyListQuery,
  CompanyListResponse,
  CompanyResponse,
  CreateCompanyInput,
  UpdateCompanyInput,
} from './company.types';

const companySelect = {
  id: true,
  teamId: true,
  ownerId: true,
  name: true,
  industry: true,
  website: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  _count: {
    select: {
      deals: true,
    },
  },
} as const;

export class CompanyRepository {
  /**
   * Constructs the database-level Prisma visibility filter.
   * - Manager: Full team visibility.
   * - Sales Rep: Companies owned OR companies with deals they own/collaborate on within their team.
   */
  private buildVisibilityFilter(user: AuthUser): Prisma.CompanyWhereInput {
    return companyPolicy.buildCompanyVisibilityFilter(user);
  }

  /**
   * Creates a new company in the specified team.
   */
  async create(data: CreateCompanyInput & { teamId: string; ownerId: string }): Promise<CompanyResponse> {
    return prisma.company.create({
      data: {
        name: data.name,
        industry: data.industry,
        website: data.website ?? null,
        teamId: data.teamId,
        ownerId: data.ownerId,
      },
      select: companySelect,
    });
  }

  /**
   * Finds a company by ID scoped strictly to the user's visibility permissions.
   * Returns null if company is non-existent, cross-team, or not accessible to the Sales Rep.
   */
  async findVisibleById(id: string, user: AuthUser): Promise<CompanyResponse | null> {
    const visibilityFilter = this.buildVisibilityFilter(user);

    return prisma.company.findFirst({
      where: {
        id,
        ...visibilityFilter,
      },
      select: companySelect,
    });
  }

  /**
   * Finds a company by ID within the team boundary (used for ownership verification prior to mutations).
   */
  async findByIdForTeam(id: string, teamId: string): Promise<CompanyResponse | null> {
    return prisma.company.findFirst({
      where: {
        id,
        teamId,
      },
      select: companySelect,
    });
  }

  /**
   * Queries visible companies with database-evaluated filtering, search, sorting, and pagination.
   */
  async listVisible(user: AuthUser, query: CompanyListQuery): Promise<CompanyListResponse> {
    const visibilityFilter = this.buildVisibilityFilter(user);

    // Archive filter semantics: 'false' -> active only, 'true' -> archived only, 'all' -> both
    let archiveFilter: Prisma.CompanyWhereInput = {};
    if (query.isArchived === 'true') {
      archiveFilter = { isArchived: true };
    } else if (query.isArchived === 'all') {
      archiveFilter = {};
    } else {
      archiveFilter = { isArchived: false };
    }

    // Search filter across name and industry
    const searchFilter: Prisma.CompanyWhereInput | undefined = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { industry: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const where: Prisma.CompanyWhereInput = {
      AND: [
        visibilityFilter,
        archiveFilter,
        ...(searchFilter ? [searchFilter] : []),
      ],
    };

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [companies, total] = await prisma.$transaction([
      prisma.company.findMany({
        where,
        select: companySelect,
        orderBy: {
          [query.sortBy]: query.sortOrder,
        },
        skip,
        take,
      }),
      prisma.company.count({ where }),
    ]);

    const totalPages = Math.ceil(total / query.limit) || 1;

    return {
      companies,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
    };
  }

  /**
   * Updates company attributes.
   */
  async update(id: string, data: UpdateCompanyInput): Promise<CompanyResponse> {
    return prisma.company.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.industry !== undefined && { industry: data.industry }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.ownerId !== undefined && { ownerId: data.ownerId }),
      },
      select: companySelect,
    });
  }

  /**
   * Updates the archive status of a company.
   */
  async setArchiveStatus(id: string, isArchived: boolean): Promise<CompanyResponse> {
    return prisma.company.update({
      where: { id },
      data: { isArchived },
      select: companySelect,
    });
  }
}

export const companyRepository = new CompanyRepository();
