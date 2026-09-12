import { UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/app-error';
import { AuthUser } from '../auth/auth.types';
import { companyPolicy } from './company.policy';
import { companyRepository } from './company.repository';
import {
  CompanyListQuery,
  CompanyListResponse,
  CompanyResponse,
  CreateCompanyInput,
  UpdateCompanyInput,
} from './company.types';

export class CompanyService {
  /**
   * Creates a new company within the authenticated user's team.
   */
  async createCompany(user: AuthUser, input: CreateCompanyInput): Promise<CompanyResponse> {
    if (!companyPolicy.canCreate(user, input.ownerId)) {
      if (user.role === UserRole.SALES_REP) {
        throw new ForbiddenError('Sales reps cannot assign companies to other users');
      }
      if (user.role === UserRole.MANAGER && input.ownerId === user.id) {
        throw new BadRequestError('Company owner must have the SALES_REP role');
      }
      throw new ForbiddenError('You do not have permission to create this company');
    }

    let targetOwnerId: string;

    if (user.role === UserRole.MANAGER) {
      if (!input.ownerId || !input.ownerId.trim()) {
        throw new BadRequestError('Managers must explicitly assign an owning sales rep');
      }

      // Validate that target owner exists, belongs to caller's team & org, and has role SALES_REP
      const targetUser = await prisma.user.findFirst({
        where: {
          id: input.ownerId,
          teamId: user.teamId,
          organizationId: user.organizationId,
        },
      });

      if (!targetUser) {
        throw new BadRequestError('Target owner does not exist or does not belong to your team');
      }

      if (targetUser.role !== UserRole.SALES_REP) {
        throw new BadRequestError('Company owner must have the SALES_REP role');
      }

      targetOwnerId = targetUser.id;
    } else {
      // Sales Rep automatically becomes the company owner
      targetOwnerId = user.id;
    }

    return companyRepository.create({
      name: input.name,
      industry: input.industry,
      website: input.website ?? null,
      teamId: user.teamId,
      ownerId: targetOwnerId,
    });
  }

  /**
   * Lists companies visible to the authenticated user.
   */
  async listCompanies(user: AuthUser, query: CompanyListQuery): Promise<CompanyListResponse> {
    return companyRepository.listVisible(user, query);
  }

  /**
   * Retrieves a single company by ID, enforcing strict server-side visibility scoping.
   * Returns 404 for non-existent, cross-team, or inaccessible companies (prevents IDOR).
   */
  async getCompanyById(user: AuthUser, companyId: string): Promise<CompanyResponse> {
    const company = await companyRepository.findVisibleById(companyId, user);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    return company;
  }

  /**
   * Updates an existing company.
   * - Manager can edit any team company.
   * - Sales Rep can edit only companies they own.
   */
  async updateCompany(
    user: AuthUser,
    companyId: string,
    input: UpdateCompanyInput
  ): Promise<CompanyResponse> {
    // 1. Locate company within the authenticated team boundary
    const company = await companyRepository.findByIdForTeam(companyId, user.teamId);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // 2. Check general edit permissions
    if (!companyPolicy.canEdit(user, company)) {
      throw new ForbiddenError('You do not have permission to edit this company');
    }

    // 3. If owner reassignment is requested:
    if (input.ownerId !== undefined) {
      if (!companyPolicy.canReassignOwner(user)) {
        throw new ForbiddenError('Only managers can reassign company ownership');
      }

      if (input.ownerId !== company.ownerId) {
        const targetUser = await prisma.user.findFirst({
          where: {
            id: input.ownerId,
            teamId: user.teamId,
            organizationId: user.organizationId,
          },
        });

        if (!targetUser) {
          throw new BadRequestError('Target owner does not exist or does not belong to your team');
        }

        if (targetUser.role !== UserRole.SALES_REP) {
          throw new BadRequestError('Company owner must have the SALES_REP role');
        }
      }
    }

    return companyRepository.update(companyId, input);
  }

  /**
   * Searches for similar companies in the user's team for advisory duplicate detection.
   * Excludes soft-deleted deals from activeDealsCount.
   * Query is non-blocking, team-scoped, and case-insensitive.
   */
  async findSimilarCompanies(user: AuthUser, name?: string): Promise<Array<{
    id: string;
    name: string;
    industry: string;
    owner: { id: string; name: string; email: string };
    activeDealsCount: number;
  }>> {
    const trimmed = (name || '').trim();
    if (trimmed.length < 2) {
      return [];
    }

    const companies = await prisma.company.findMany({
      where: {
        teamId: user.teamId,
        name: {
          contains: trimmed,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        industry: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            deals: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
      take: 3,
      orderBy: {
        name: 'asc',
      },
    });

    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      owner: c.owner,
      activeDealsCount: c._count.deals,
    }));
  }

  /**
   * Archives a company (soft-archive state).
   */
  async archiveCompany(user: AuthUser, companyId: string): Promise<CompanyResponse> {
    const company = await companyRepository.findByIdForTeam(companyId, user.teamId);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    if (!companyPolicy.canArchive(user, company)) {
      throw new ForbiddenError('You do not have permission to archive this company');
    }

    if (company.isArchived) {
      return company;
    }

    return companyRepository.setArchiveStatus(companyId, true);
  }

  /**
   * Restores an archived company to active state.
   */
  async restoreCompany(user: AuthUser, companyId: string): Promise<CompanyResponse> {
    const company = await companyRepository.findByIdForTeam(companyId, user.teamId);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    if (!companyPolicy.canRestore(user, company)) {
      throw new ForbiddenError('You do not have permission to restore this company');
    }

    if (!company.isArchived) {
      return company;
    }

    return companyRepository.setArchiveStatus(companyId, false);
  }
}

export const companyService = new CompanyService();
