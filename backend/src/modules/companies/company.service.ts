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
      throw new ForbiddenError('Sales reps cannot assign companies to other users');
    }

    let targetOwnerId = user.id;

    if (input.ownerId && input.ownerId !== user.id) {
      // Validate that the target owner exists and belongs to the authenticated team
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

      targetOwnerId = targetUser.id;
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

    // 3. If owner reassignment is requested, verify caller is Manager and target belongs to team
    if (input.ownerId && input.ownerId !== company.ownerId) {
      if (!companyPolicy.canReassignOwner(user)) {
        throw new ForbiddenError('Only managers can reassign company ownership');
      }

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
    }

    return companyRepository.update(companyId, input);
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
