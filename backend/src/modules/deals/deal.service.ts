import { UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/app-error';
import { AuthUser } from '../auth/auth.types';
import { dealPolicy } from './deal.policy';
import { dealRepository } from './deal.repository';
import { dealTransitionPolicy } from './deal.transition-policy';
import {
  CreateDealInput,
  DealListQuery,
  DealListResponse,
  DealResponse,
  TransitionStageInput,
  UpdateDealInput,
} from './deal.types';

export class DealService {
  /**
   * Creates a new deal within the authenticated user's team.
   */
  async createDeal(user: AuthUser, input: CreateDealInput): Promise<DealResponse> {
    // 1. Authorization check for ownership assignment
    if (!dealPolicy.canCreate(user, input.ownerId)) {
      throw new ForbiddenError('Sales reps cannot assign deals to other users');
    }

    // 2. Validate Company: must exist in team and cannot be archived
    const company = await prisma.company.findFirst({
      where: {
        id: input.companyId,
        teamId: user.teamId,
      },
    });

    if (!company) {
      throw new BadRequestError('Target company does not exist or does not belong to your team');
    }

    if (company.isArchived) {
      throw new BadRequestError('Cannot create deals for archived companies');
    }

    // 3. Determine and validate target owner
    let targetOwnerId = user.id;

    if (input.ownerId && input.ownerId !== user.id) {
      const targetUser = await prisma.user.findFirst({
        where: {
          id: input.ownerId,
          teamId: user.teamId,
          organizationId: user.organizationId,
          role: UserRole.SALES_REP,
        },
      });

      if (!targetUser) {
        throw new BadRequestError('Target owner must be a valid Sales Rep in your team');
      }

      targetOwnerId = targetUser.id;
    }

    return dealRepository.createWithHistory(
      {
        ...input,
        teamId: user.teamId,
        ownerId: targetOwnerId,
      },
      user.id
    );
  }

  /**
   * Lists active non-deleted deals visible to the authenticated user.
   */
  async listDeals(user: AuthUser, query: DealListQuery): Promise<DealListResponse> {
    return dealRepository.listVisible(user, query);
  }

  /**
   * Lists soft-deleted deals (Trash view) with scoped visibility.
   */
  async listTrash(user: AuthUser, query: DealListQuery): Promise<DealListResponse> {
    return dealRepository.listTrash(user, query);
  }

  /**
   * Retrieves a single deal by ID with strict server-side visibility scoping (IDOR protection).
   */
  async getDealById(user: AuthUser, dealId: string): Promise<DealResponse> {
    const deal = await dealRepository.findVisibleById(dealId, user);

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    return deal;
  }

  /**
   * Updates mutable attributes of an existing active deal.
   */
  async updateDeal(
    user: AuthUser,
    dealId: string,
    input: UpdateDealInput
  ): Promise<DealResponse> {
    // 1. Locate deal within team boundary
    const deal = await dealRepository.findByIdForTeam(dealId, user.teamId, false);

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    // 2. Enforce mutation policy (Manager, Owner, or Collaborator)
    if (!dealPolicy.canEdit(user, deal)) {
      throw new ForbiddenError('You do not have permission to edit this deal');
    }

    // 3. If company is changed, validate it belongs to team and is not archived
    if (input.companyId && input.companyId !== deal.companyId) {
      const company = await prisma.company.findFirst({
        where: {
          id: input.companyId,
          teamId: user.teamId,
        },
      });

      if (!company) {
        throw new BadRequestError('Target company does not exist or does not belong to your team');
      }

      if (company.isArchived) {
        throw new BadRequestError('Cannot associate deals with an archived company');
      }
    }

    // 4. If owner reassignment is requested, verify Manager role and target user validity
    if (input.ownerId && input.ownerId !== deal.ownerId) {
      if (!dealPolicy.canReassignOwner(user)) {
        throw new ForbiddenError('Only managers can reassign deal ownership');
      }

      const targetUser = await prisma.user.findFirst({
        where: {
          id: input.ownerId,
          teamId: user.teamId,
          organizationId: user.organizationId,
          role: UserRole.SALES_REP,
        },
      });

      if (!targetUser) {
        throw new BadRequestError('Target owner must be a valid Sales Rep in your team');
      }
    }

    return dealRepository.updateWithHistory(dealId, input, user.id, deal.ownerId);
  }

  /**
   * Transitions a deal's lifecycle stage according to the state machine.
   */
  async transitionStage(
    user: AuthUser,
    dealId: string,
    input: TransitionStageInput
  ): Promise<DealResponse> {
    const deal = await dealRepository.findByIdForTeam(dealId, user.teamId, false);

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    if (!dealPolicy.canTransitionStage(user, deal)) {
      throw new ForbiddenError('You do not have permission to transition this deal');
    }

    const validationResult = dealTransitionPolicy.isTransitionLegal(
      deal.stage,
      input.stage,
      input.reason
    );

    if (!validationResult.legal) {
      throw new BadRequestError(validationResult.error ?? 'Illegal stage transition');
    }

    return dealRepository.transitionStage(
      dealId,
      deal.stage,
      input.stage,
      validationResult.isClosing ?? false,
      input.reason,
      user.id
    );
  }

  /**
   * Reopens a closed (WON or LOST) deal back to its previousStage (Manager only).
   */
  async reopenDeal(user: AuthUser, dealId: string): Promise<DealResponse> {
    const deal = await dealRepository.findByIdForTeam(dealId, user.teamId, false);

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    if (!dealPolicy.canReopen(user)) {
      throw new ForbiddenError('Only managers can reopen closed deals');
    }

    const reopenResult = dealTransitionPolicy.canReopen(deal.stage, deal.previousStage);

    if (!reopenResult.legal || !reopenResult.targetStage) {
      throw new BadRequestError(reopenResult.error ?? 'Deal cannot be reopened');
    }

    return dealRepository.reopenDeal(
      dealId,
      deal.stage,
      reopenResult.targetStage,
      user.id
    );
  }

  /**
   * Soft-deletes a deal (Manager or Deal Owner only).
   */
  async deleteDeal(user: AuthUser, dealId: string): Promise<DealResponse> {
    const deal = await dealRepository.findByIdForTeam(dealId, user.teamId, false);

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    if (!dealPolicy.canDelete(user, deal)) {
      throw new ForbiddenError('You do not have permission to delete this deal');
    }

    return dealRepository.softDelete(dealId, user.id);
  }
}

export const dealService = new DealService();
