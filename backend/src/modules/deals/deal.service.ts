import { UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/app-error';
import { AuthUser } from '../auth/auth.types';
import { dealPolicy } from './deal.policy';
import { dealRepository } from './deal.repository';
import { dealTransitionPolicy } from './deal.transition-policy';
import {
  AddCollaboratorInput,
  AddNoteInput,
  BulkAdvanceInput,
  BulkOperationResponse,
  BulkReassignInput,
  BulkResultItem,
  CollaboratorResponse,
  CreateDealInput,
  DealHistoryResponse,
  DealListQuery,
  DealListResponse,
  DealResponse,
  STAGE_PROBABILITY,
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
      if (user.role === UserRole.SALES_REP) {
        throw new ForbiddenError('Sales reps cannot assign deals to other users');
      }
      if (user.role === UserRole.MANAGER && input.ownerId === user.id) {
        throw new BadRequestError('Deal owner must have the SALES_REP role');
      }
      throw new ForbiddenError('You do not have permission to create this deal');
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
        throw new BadRequestError('Deal owner must have the SALES_REP role');
      }

      targetOwnerId = targetUser.id;
    } else {
      // Sales Rep automatically becomes the deal owner
      targetOwnerId = user.id;
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

  /**
   * Lists all collaborators on an active deal.
   */
  async listCollaborators(user: AuthUser, dealId: string): Promise<CollaboratorResponse[]> {
    const deal = await dealRepository.findByIdForTeam(dealId, user.teamId, false);

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    if (!dealPolicy.canView(user, deal)) {
      throw new NotFoundError('Deal not found');
    }

    return dealRepository.listCollaborators(dealId);
  }

  /**
   * Adds a collaborator to an active deal.
   * Only Manager or Deal Owner can add collaborators.
   * Collaborators must be valid Sales Reps in the same team and cannot be the Deal Owner.
   */
  async addCollaborator(
    user: AuthUser,
    dealId: string,
    input: AddCollaboratorInput
  ): Promise<CollaboratorResponse> {
    const deal = await dealRepository.findByIdForTeam(dealId, user.teamId, false);

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    if (!dealPolicy.canManageCollaborators(user, deal)) {
      throw new ForbiddenError('Only the deal owner or a manager can add collaborators');
    }

    // Owner cannot be added as collaborator
    if (input.userId === deal.ownerId) {
      throw new BadRequestError('Deal owner cannot be added as a collaborator');
    }

    // Validate target user: must exist, same team, role SALES_REP
    const targetUser = await prisma.user.findFirst({
      where: {
        id: input.userId,
        teamId: user.teamId,
        organizationId: user.organizationId,
      },
    });

    if (!targetUser) {
      throw new BadRequestError('Target collaborator does not exist or does not belong to your team');
    }

    if (targetUser.role !== UserRole.SALES_REP) {
      throw new BadRequestError('Collaborators must have the SALES_REP role');
    }

    // Check for duplicate collaborator
    const existingCollaborator = await dealRepository.findCollaborator(dealId, input.userId);
    if (existingCollaborator) {
      throw new BadRequestError('User is already a collaborator on this deal');
    }

    return dealRepository.addCollaboratorWithHistory(dealId, input.userId, user.id);
  }

  /**
   * Removes a collaborator from an active deal.
   * Only Manager or Deal Owner can remove collaborators.
   */
  async removeCollaborator(
    user: AuthUser,
    dealId: string,
    targetUserId: string
  ): Promise<{ message: string }> {
    const deal = await dealRepository.findByIdForTeam(dealId, user.teamId, false);

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    if (!dealPolicy.canManageCollaborators(user, deal)) {
      throw new ForbiddenError('Only the deal owner or a manager can remove collaborators');
    }

    const existing = await dealRepository.findCollaborator(dealId, targetUserId);
    if (!existing) {
      throw new BadRequestError('User is not a collaborator on this deal');
    }

    await dealRepository.removeCollaboratorWithHistory(dealId, targetUserId, user.id);
    return { message: 'Collaborator removed successfully' };
  }

  /**
   * Adds an immutable note to a deal.
   * Manager, Deal Owner, or Deal Collaborator can add notes.
   */
  async addNote(
    user: AuthUser,
    dealId: string,
    input: AddNoteInput
  ): Promise<DealHistoryResponse> {
    const deal = await dealRepository.findByIdForTeam(dealId, user.teamId, false);

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    if (!dealPolicy.canAddNote(user, deal)) {
      throw new ForbiddenError('You do not have permission to add notes to this deal');
    }

    return dealRepository.addNoteWithHistory(dealId, input.note, user.id);
  }

  /**
   * Retrieves the immutable audit history for a deal (including soft-deleted deals).
   * Manager, Deal Owner, or Deal Collaborator can view history.
   */
  async getDealHistory(user: AuthUser, dealId: string): Promise<DealHistoryResponse[]> {
    // includeDeleted = true: soft-deleted deal history remains viewable to authorized users
    const deal = await dealRepository.findByIdForTeam(dealId, user.teamId, true);

    if (!deal) {
      throw new NotFoundError('Deal not found');
    }

    if (!dealPolicy.canViewHistory(user, deal)) {
      throw new NotFoundError('Deal not found');
    }

    return dealRepository.getDealHistory(dealId);
  }

  /**
   * Bulk reassigns deals to a new Sales Rep owner within the manager's team.
   * Only Managers can perform bulk reassignment.
   * Partial success is returned; each deal is processed independently and atomically.
   */
  async bulkReassign(
    user: AuthUser,
    input: BulkReassignInput
  ): Promise<BulkOperationResponse> {
    if (user.role !== UserRole.MANAGER) {
      throw new ForbiddenError('Only managers can perform bulk deal reassignment');
    }

    // Validate target owner: exists, same team, role SALES_REP
    const targetOwner = await prisma.user.findFirst({
      where: {
        id: input.ownerId,
        teamId: user.teamId,
        organizationId: user.organizationId,
      },
    });

    if (!targetOwner) {
      throw new BadRequestError('Target owner does not exist or does not belong to your team');
    }

    if (targetOwner.role !== UserRole.SALES_REP) {
      throw new BadRequestError('Deals can only be assigned to Sales Reps');
    }

    const results: BulkResultItem[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const dealId of input.dealIds) {
      const deal = await dealRepository.findByIdForTeam(dealId, user.teamId, true);

      if (!deal) {
        results.push({
          dealId,
          status: 'failed',
          reason: 'DEAL_NOT_FOUND',
          message: 'Deal was not found.',
        });
        failed++;
        continue;
      }

      if (deal.deletedAt !== null) {
        results.push({
          dealId,
          status: 'failed',
          reason: 'DEAL_DELETED',
          message: 'Cannot reassign a soft-deleted deal.',
        });
        failed++;
        continue;
      }

      if (deal.ownerId === input.ownerId) {
        results.push({
          dealId,
          status: 'failed',
          reason: 'ALREADY_ASSIGNED',
          message: 'Deal is already assigned to this sales rep.',
        });
        failed++;
        continue;
      }

      try {
        await dealRepository.reassignSingleDealWithHistory(
          deal.id,
          input.ownerId,
          deal.ownerId,
          user.id
        );
        results.push({
          dealId,
          status: 'success',
        });
        succeeded++;
      } catch (err: unknown) {
        results.push({
          dealId,
          status: 'failed',
          reason: 'MUTATION_FAILED',
          message: 'Failed to reassign deal.',
        });
        failed++;
      }
    }

    return {
      success: true,
      results,
      summary: {
        requested: input.dealIds.length,
        succeeded,
        failed,
      },
    };
  }

  /**
   * Bulk advances deals forward one lifecycle stage.
   * Only Managers can perform bulk advance.
   * Partial success is returned; each deal is processed independently and atomically.
   * Respects pure DealTransitionPolicy (does not guess WON/LOST for NEGOTIATION).
   */
  async bulkAdvance(
    user: AuthUser,
    input: BulkAdvanceInput
  ): Promise<BulkOperationResponse> {
    if (user.role !== UserRole.MANAGER) {
      throw new ForbiddenError('Only managers can perform bulk deal stage advancement');
    }

    const results: BulkResultItem[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const dealId of input.dealIds) {
      const deal = await dealRepository.findByIdForTeam(dealId, user.teamId, true);

      if (!deal) {
        results.push({
          dealId,
          status: 'failed',
          reason: 'DEAL_NOT_FOUND',
          message: 'Deal was not found.',
        });
        failed++;
        continue;
      }

      if (deal.deletedAt !== null) {
        results.push({
          dealId,
          status: 'failed',
          reason: 'DEAL_DELETED',
          message: 'Cannot advance a soft-deleted deal.',
        });
        failed++;
        continue;
      }

      const advanceEval = dealTransitionPolicy.getBulkAdvanceTarget(deal.stage);
      if (!advanceEval.canAdvance || !advanceEval.targetStage) {
        results.push({
          dealId,
          status: 'failed',
          reason: advanceEval.reason || 'INVALID_TRANSITION',
          message: advanceEval.message || 'Cannot advance deal stage.',
        });
        failed++;
        continue;
      }

      const validation = dealTransitionPolicy.isTransitionLegal(deal.stage, advanceEval.targetStage);
      if (!validation.legal) {
        results.push({
          dealId,
          status: 'failed',
          reason: 'INVALID_TRANSITION',
          message: validation.error || 'Illegal stage transition.',
        });
        failed++;
        continue;
      }

      try {
        await dealRepository.transitionStage(
          deal.id,
          deal.stage,
          advanceEval.targetStage,
          validation.isClosing ?? false,
          undefined,
          user.id
        );
        results.push({
          dealId,
          status: 'success',
        });
        succeeded++;
      } catch (err: unknown) {
        results.push({
          dealId,
          status: 'failed',
          reason: 'MUTATION_FAILED',
          message: 'Failed to advance deal stage.',
        });
        failed++;
      }
    }

    return {
      success: true,
      results,
      summary: {
        requested: input.dealIds.length,
        succeeded,
        failed,
      },
    };
  }

  /**
   * Generates a CSV export of all active open deals visible to the authenticated user.
   * Format: Company,Stage,Value,Weighted Value
   */
  async exportOpenDealsCsv(user: AuthUser): Promise<string> {
    const deals = await dealRepository.getOpenDealsForExport(user);

    const escapeCsvField = (field: string): string => {
      if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const header = 'Company,Stage,Value,Weighted Value';
    const rows = deals.map((deal) => {
      const company = escapeCsvField(deal.company.name);
      const stage = deal.stage;
      const value = deal.value.toFixed(2);
      const weightedValue = deal.value.mul(STAGE_PROBABILITY[deal.stage]).toFixed(2);
      return `${company},${stage},${value},${weightedValue}`;
    });

    return [header, ...rows].join('\r\n');
  }
}

export const dealService = new DealService();
