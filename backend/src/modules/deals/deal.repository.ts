import { DealStage, HistoryType, NotificationType, Prisma, UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AuthUser } from '../auth/auth.types';
import { notificationRepository } from '../notifications/notification.repository';
import {
  buildPersonalizedNotifications,
  resolveDealNotificationRecipients,
} from '../notifications/notification.helper';
import {
  CollaboratorResponse,
  CreateDealInput,
  DealHistoryResponse,
  DealListQuery,
  DealListResponse,
  DealResponse,
  STAGE_PROBABILITY,
  UpdateDealInput,
} from './deal.types';

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
} as const;

const collaboratorSelect = {
  dealId: true,
  userId: true,
  createdAt: true,
  user: {
    select: safeUserSelect,
  },
} as const;

const dealHistorySelect = {
  id: true,
  dealId: true,
  actorId: true,
  type: true,
  oldStage: true,
  newStage: true,
  oldOwnerId: true,
  newOwnerId: true,
  collaboratorId: true,
  reason: true,
  note: true,
  createdAt: true,
  actor: {
    select: safeUserSelect,
  },
  collaborator: {
    select: safeUserSelect,
  },
  oldOwner: {
    select: safeUserSelect,
  },
  newOwner: {
    select: safeUserSelect,
  },
} as const;

const dealSelect = {
  id: true,
  teamId: true,
  companyId: true,
  ownerId: true,
  title: true,
  value: true,
  expectedCloseDate: true,
  stage: true,
  previousStage: true,
  closedAt: true,
  deletedAt: true,
  deletedById: true,
  createdAt: true,
  updatedAt: true,
  company: {
    select: {
      id: true,
      name: true,
      industry: true,
      isArchived: true,
    },
  },
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  collaborators: {
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
} as const;

export function mapDealToResponse(deal: any): DealResponse {
  // Exact Decimal money formatting
  const valDecimal = deal.value instanceof Prisma.Decimal
    ? deal.value
    : new Prisma.Decimal(deal.value.toString());
  const valueStr = valDecimal.toFixed(2);

  // Exact derived weightedValue calculation
  const prob = STAGE_PROBABILITY[deal.stage as DealStage] ?? 0;
  const weightedValStr = valDecimal.mul(prob).toFixed(2);

  // Calendar date YYYY-MM-DD formatting without timezone shift
  let dateStr = '';
  if (deal.expectedCloseDate instanceof Date) {
    dateStr = deal.expectedCloseDate.toISOString().split('T')[0];
  } else {
    dateStr = String(deal.expectedCloseDate);
  }

  return {
    id: deal.id,
    teamId: deal.teamId,
    companyId: deal.companyId,
    ownerId: deal.ownerId,
    title: deal.title,
    value: valueStr,
    weightedValue: weightedValStr,
    expectedCloseDate: dateStr,
    stage: deal.stage,
    stageProbability: prob,
    previousStage: deal.previousStage,
    closedAt: deal.closedAt,
    deletedAt: deal.deletedAt,
    deletedById: deal.deletedById,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    company: deal.company,
    owner: deal.owner,
    collaborators: deal.collaborators,
  };
}

export class DealRepository {
  /**
   * Constructs the database-level Prisma visibility filter.
   * - Manager: Full team visibility.
   * - Sales Rep: Deals where they are Owner OR Collaborator.
   */
  public buildVisibilityFilter(
    user: AuthUser,
    isTrash = false
  ): Prisma.DealWhereInput {
    const deletedCondition: Prisma.DealWhereInput = isTrash
      ? { deletedAt: { not: null } }
      : { deletedAt: null };

    if (user.role === UserRole.MANAGER) {
      return {
        teamId: user.teamId,
        ...deletedCondition,
      };
    }

    return {
      teamId: user.teamId,
      ...deletedCondition,
      OR: [
        { ownerId: user.id },
        {
          collaborators: {
            some: {
              userId: user.id,
            },
          },
        },
      ],
    };
  }

  /**
   * Creates a Deal and appends a CREATED history event atomically inside a transaction.
   */
  async createWithHistory(
    data: CreateDealInput & { teamId: string; ownerId: string },
    actorId: string
  ): Promise<DealResponse> {
    const closeDate = new Date(`${data.expectedCloseDate}T00:00:00.000Z`);

    return prisma.$transaction(async (tx) => {
      const deal = await tx.deal.create({
        data: {
          title: data.title,
          companyId: data.companyId,
          teamId: data.teamId,
          ownerId: data.ownerId,
          value: new Prisma.Decimal(data.value),
          expectedCloseDate: closeDate,
          stage: DealStage.NEW,
        },
        select: dealSelect,
      });

      await tx.dealHistory.create({
        data: {
          dealId: deal.id,
          actorId,
          type: HistoryType.CREATED,
        },
      });

      // Activity Notification: DEAL_CREATED
      const { recipientUserIds } = await resolveDealNotificationRecipients(tx, {
        dealId: deal.id,
        teamId: data.teamId,
        actorId,
        ownerId: data.ownerId,
      });
      const notifications = await buildPersonalizedNotifications(tx, {
        dealId: deal.id,
        dealTitle: deal.title,
        type: NotificationType.DEAL_CREATED,
        actorId,
        ownerId: data.ownerId,
        recipientUserIds,
      });
      await notificationRepository.createActivityNotifications(tx, notifications);

      return mapDealToResponse(deal);
    });
  }

  /**
   * Finds an active non-deleted deal by ID scoped to the user's visibility permissions.
   * Returns null if unpermitted, cross-team, or non-existent (prevents IDOR).
   */
  async findVisibleById(id: string, user: AuthUser): Promise<DealResponse | null> {
    const visibilityFilter = this.buildVisibilityFilter(user, false);

    const deal = await prisma.deal.findFirst({
      where: {
        id,
        ...visibilityFilter,
      },
      select: dealSelect,
    });

    return deal ? mapDealToResponse(deal) : null;
  }

  /**
   * Finds a deal by ID within the team boundary (used for ownership verification prior to mutations).
   */
  async findByIdForTeam(
    id: string,
    teamId: string,
    includeDeleted = false
  ): Promise<DealResponse | null> {
    const deal = await prisma.deal.findFirst({
      where: {
        id,
        teamId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      select: dealSelect,
    });

    return deal ? mapDealToResponse(deal) : null;
  }

  /**
   * Queries active non-deleted deals with database-level visibility, filtering, sorting, and pagination.
   */
  async listVisible(user: AuthUser, query: DealListQuery): Promise<DealListResponse> {
    const visibilityFilter = this.buildVisibilityFilter(user, false);

    const filterConditions: Prisma.DealWhereInput[] = [visibilityFilter];

    if (query.stage) {
      filterConditions.push({ stage: query.stage });
    }
    if (query.ownerId) {
      filterConditions.push({ ownerId: query.ownerId });
    }
    if (query.companyId) {
      filterConditions.push({ companyId: query.companyId });
    }
    if (query.isReopened === true) {
      filterConditions.push({
        closedAt: null,
        previousStage: { not: null },
      });
    } else if (query.isReopened === false) {
      filterConditions.push({
        previousStage: null,
      });
    }
    if (query.search) {
      filterConditions.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { company: { name: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }

    const where: Prisma.DealWhereInput = {
      AND: filterConditions,
    };

    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const [deals, total] = await prisma.$transaction([
      prisma.deal.findMany({
        where,
        select: dealSelect,
        orderBy: [
          {
            [query.sortBy]: query.sortOrder,
          },
          {
            id: 'asc',
          },
        ],
        skip,
        take,
      }),
      prisma.deal.count({ where }),
    ]);

    const totalPages = Math.ceil(total / query.pageSize);

    return {
      deals: deals.map(mapDealToResponse),
      pagination: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        limit: query.pageSize,
        totalPages,
      },
    };
  }

  /**
   * Queries soft-deleted deals (Trash view) with scoped team/rep visibility.
   */
  async listTrash(user: AuthUser, query: DealListQuery): Promise<DealListResponse> {
    const visibilityFilter = this.buildVisibilityFilter(user, true);

    const filterConditions: Prisma.DealWhereInput[] = [visibilityFilter];

    if (query.stage) {
      filterConditions.push({ stage: query.stage });
    }
    if (query.ownerId) {
      filterConditions.push({ ownerId: query.ownerId });
    }
    if (query.companyId) {
      filterConditions.push({ companyId: query.companyId });
    }

    const where: Prisma.DealWhereInput = {
      AND: filterConditions,
    };

    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const [deals, total] = await prisma.$transaction([
      prisma.deal.findMany({
        where,
        select: dealSelect,
        orderBy: [
          {
            deletedAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip,
        take,
      }),
      prisma.deal.count({ where }),
    ]);

    const totalPages = Math.ceil(total / query.pageSize);

    return {
      deals: deals.map(mapDealToResponse),
      pagination: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        limit: query.pageSize,
        totalPages,
      },
    };
  }

  /**
   * Updates deal attributes and appends OWNER_CHANGED history if ownership was reassigned.
   */
  async updateWithHistory(
    id: string,
    data: UpdateDealInput,
    actorId: string,
    oldOwnerId?: string
  ): Promise<DealResponse> {
    const updatePayload: Prisma.DealUpdateInput = {};

    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.value !== undefined) updatePayload.value = new Prisma.Decimal(data.value);
    if (data.companyId !== undefined) updatePayload.company = { connect: { id: data.companyId } };
    if (data.ownerId !== undefined) updatePayload.owner = { connect: { id: data.ownerId } };
    if (data.expectedCloseDate !== undefined) {
      updatePayload.expectedCloseDate = new Date(`${data.expectedCloseDate}T00:00:00.000Z`);
    }

    return prisma.$transaction(
      async (tx) => {
        // If owner changed, enforce invariant that owner cannot be a collaborator,
        // record OWNER_CHANGED in immutable history, and sync notification recipient
        if (data.ownerId && oldOwnerId && data.ownerId !== oldOwnerId) {
          // Invariant: Deal owner can never be a collaborator.
          // If the new owner was previously a collaborator, remove them in this transaction.
          await tx.dealCollaborator.deleteMany({
            where: {
              dealId: id,
              userId: data.ownerId,
            },
          });

          const updatedDeal = await tx.deal.update({
            where: { id },
            data: updatePayload,
            select: dealSelect,
          });

          await tx.dealHistory.create({
            data: {
              dealId: id,
              actorId,
              type: HistoryType.OWNER_CHANGED,
              oldOwnerId,
              newOwnerId: data.ownerId,
            },
          });

          // Keep notification recipient aligned with new deal owner
          const existingAlert = await tx.dealAlert.findUnique({
            where: { dealId: id },
            select: { notificationId: true },
          });
          if (existingAlert) {
            await tx.notification.update({
              where: { id: existingAlert.notificationId },
              data: { userId: data.ownerId },
            });
          }

          // Activity Notification: OWNER_CHANGED
          const { dealTitle, recipientUserIds } = await resolveDealNotificationRecipients(tx, {
            dealId: id,
            actorId,
            ownerId: data.ownerId,
          });
          const notifications = await buildPersonalizedNotifications(tx, {
            dealId: id,
            dealTitle,
            type: NotificationType.OWNER_CHANGED,
            actorId,
            targetUserId: data.ownerId,
            recipientUserIds,
          });
          await notificationRepository.createActivityNotifications(tx, notifications);

          return mapDealToResponse(updatedDeal);
        }

        const updatedDeal = await tx.deal.update({
          where: { id },
          data: updatePayload,
          select: dealSelect,
        });

        return mapDealToResponse(updatedDeal);
      },
      { timeout: 15000, maxWait: 10000 }
    );
  }

  /**
   * Atomically transitions a deal stage and records STAGE_CHANGED history.
   */
  async transitionStage(
    id: string,
    currentStage: DealStage,
    targetStage: DealStage,
    isClosing: boolean,
    reason: string | undefined,
    actorId: string
  ): Promise<DealResponse> {
    return prisma.$transaction(async (tx) => {
      const updatedDeal = await tx.deal.update({
        where: { id },
        data: {
          stage: targetStage,
          ...(isClosing && {
            closedAt: new Date(),
            previousStage: currentStage,
          }),
        },
        select: dealSelect,
      });

      await tx.dealHistory.create({
        data: {
          dealId: id,
          actorId,
          type: HistoryType.STAGE_CHANGED,
          oldStage: currentStage,
          newStage: targetStage,
          reason: reason ?? null,
        },
      });

      // Activity Notification: Stage advance / regress / won / lost
      let notificationType: NotificationType;
      if (targetStage === DealStage.WON) {
        notificationType = NotificationType.DEAL_WON;
      } else if (targetStage === DealStage.LOST) {
        notificationType = NotificationType.DEAL_LOST;
      } else if (
        (currentStage === DealStage.QUALIFIED && targetStage === DealStage.NEW) ||
        (currentStage === DealStage.PROPOSAL && targetStage === DealStage.QUALIFIED) ||
        (currentStage === DealStage.NEGOTIATION && targetStage === DealStage.PROPOSAL)
      ) {
        notificationType = NotificationType.DEAL_STAGE_REGRESSED;
      } else {
        notificationType = NotificationType.DEAL_STAGE_ADVANCED;
      }

      const { recipientUserIds } = await resolveDealNotificationRecipients(tx, {
        dealId: id,
        actorId,
      });
      const notifications = await buildPersonalizedNotifications(tx, {
        dealId: id,
        dealTitle: updatedDeal.title,
        type: notificationType,
        actorId,
        targetStage,
        reason,
        recipientUserIds,
      });
      await notificationRepository.createActivityNotifications(tx, notifications);

      return mapDealToResponse(updatedDeal);
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Atomically reopens a closed deal, restoring previousStage and recording REOPENED history.
   */
  async reopenDeal(
    id: string,
    currentStage: DealStage,
    targetStage: DealStage,
    actorId: string
  ): Promise<DealResponse> {
    return prisma.$transaction(async (tx) => {
      const updatedDeal = await tx.deal.update({
        where: { id },
        data: {
          stage: targetStage,
          closedAt: null,
        },
        select: dealSelect,
      });

      await tx.dealHistory.create({
        data: {
          dealId: id,
          actorId,
          type: HistoryType.REOPENED,
          oldStage: currentStage,
          newStage: targetStage,
        },
      });

      // Activity Notification: DEAL_REOPENED
      const { recipientUserIds } = await resolveDealNotificationRecipients(tx, {
        dealId: id,
        actorId,
      });
      const notifications = await buildPersonalizedNotifications(tx, {
        dealId: id,
        dealTitle: updatedDeal.title,
        type: NotificationType.DEAL_REOPENED,
        actorId,
        targetStage: updatedDeal.stage,
        recipientUserIds,
      });
      await notificationRepository.createActivityNotifications(tx, notifications);

      return mapDealToResponse(updatedDeal);
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Atomically soft-deletes a deal (sets deletedAt & deletedById) and appends a DELETED history event.
   */
  async softDelete(id: string, actorId: string): Promise<DealResponse> {
    return prisma.$transaction(async (tx) => {
      const deletedDeal = await tx.deal.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: actorId,
        },
        select: dealSelect,
      });

      await tx.dealHistory.create({
        data: {
          dealId: id,
          actorId,
          type: HistoryType.DELETED,
        },
      });

      return mapDealToResponse(deletedDeal);
    });
  }

  /**
   * Lists all collaborators on a deal.
   */
  async listCollaborators(dealId: string): Promise<CollaboratorResponse[]> {
    return prisma.dealCollaborator.findMany({
      where: { dealId },
      select: collaboratorSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Finds a specific collaborator record on a deal.
   */
  async findCollaborator(dealId: string, userId: string): Promise<{ dealId: string; userId: string } | null> {
    return prisma.dealCollaborator.findUnique({
      where: {
        dealId_userId: {
          dealId,
          userId,
        },
      },
    });
  }

  /**
   * Atomically adds a collaborator and writes a COLLABORATOR_ADDED history event.
   */
  async addCollaboratorWithHistory(
    dealId: string,
    collaboratorId: string,
    actorId: string
  ): Promise<CollaboratorResponse> {
    return prisma.$transaction(async (tx) => {
      const collaborator = await tx.dealCollaborator.create({
        data: {
          dealId,
          userId: collaboratorId,
        },
        select: collaboratorSelect,
      });

      await tx.dealHistory.create({
        data: {
          dealId,
          actorId,
          collaboratorId,
          type: HistoryType.COLLABORATOR_ADDED,
        },
      });

      // Activity Notification: COLLABORATOR_ADDED
      const { dealTitle, recipientUserIds } = await resolveDealNotificationRecipients(tx, {
        dealId,
        actorId,
        additionalRecipientIds: [collaboratorId],
      });
      const notifications = await buildPersonalizedNotifications(tx, {
        dealId,
        dealTitle,
        type: NotificationType.COLLABORATOR_ADDED,
        actorId,
        targetUserId: collaboratorId,
        recipientUserIds,
      });
      await notificationRepository.createActivityNotifications(tx, notifications);

      return collaborator;
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Atomically removes a collaborator and writes a COLLABORATOR_REMOVED history event.
   */
  async removeCollaboratorWithHistory(
    dealId: string,
    collaboratorId: string,
    actorId: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.dealCollaborator.delete({
        where: {
          dealId_userId: {
            dealId,
            userId: collaboratorId,
          },
        },
      });

      await tx.dealHistory.create({
        data: {
          dealId,
          actorId,
          collaboratorId,
          type: HistoryType.COLLABORATOR_REMOVED,
        },
      });

      // Activity Notification: COLLABORATOR_REMOVED
      const { dealTitle, recipientUserIds } = await resolveDealNotificationRecipients(tx, {
        dealId,
        actorId,
        excludedRecipientIds: [collaboratorId],
      });
      const notifications = await buildPersonalizedNotifications(tx, {
        dealId,
        dealTitle,
        type: NotificationType.COLLABORATOR_REMOVED,
        actorId,
        targetUserId: collaboratorId,
        recipientUserIds,
      });
      await notificationRepository.createActivityNotifications(tx, notifications);
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Atomically adds a note to a deal and records a NOTE_ADDED history event.
   */
  async addNoteWithHistory(
    dealId: string,
    note: string,
    actorId: string
  ): Promise<DealHistoryResponse> {
    return prisma.$transaction(async (tx) => {
      const history = await tx.dealHistory.create({
        data: {
          dealId,
          actorId,
          type: HistoryType.NOTE_ADDED,
          note,
        },
        select: dealHistorySelect,
      });

      // Activity Notification: NOTE_ADDED
      const { dealTitle, recipientUserIds } = await resolveDealNotificationRecipients(tx, {
        dealId,
        actorId,
      });
      const notifications = await buildPersonalizedNotifications(tx, {
        dealId,
        dealTitle,
        type: NotificationType.NOTE_ADDED,
        actorId,
        recipientUserIds,
      });
      await notificationRepository.createActivityNotifications(tx, notifications);

      return history;
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Atomically reassigns a single deal's owner, removes the new owner from collaborators
   * if previously a collaborator (enforcing the owner-not-collaborator invariant),
   * and records an OWNER_CHANGED history event.
   */
  async reassignSingleDealWithHistory(
    dealId: string,
    newOwnerId: string,
    oldOwnerId: string,
    actorId: string
  ): Promise<DealResponse> {
    return prisma.$transaction(async (tx) => {
      // Invariant: Deal owner can never be a collaborator.
      // If the new owner was previously a collaborator, remove them in this transaction.
      await tx.dealCollaborator.deleteMany({
        where: {
          dealId,
          userId: newOwnerId,
        },
      });

      const updatedDeal = await tx.deal.update({
        where: { id: dealId },
        data: {
          ownerId: newOwnerId,
        },
        select: dealSelect,
      });

      await tx.dealHistory.create({
        data: {
          dealId,
          actorId,
          type: HistoryType.OWNER_CHANGED,
          oldOwnerId,
          newOwnerId,
        },
      });

      // Keep notification recipient aligned with new deal owner
      const existingAlert = await tx.dealAlert.findUnique({
        where: { dealId },
        select: { notificationId: true },
      });
      if (existingAlert) {
        await tx.notification.update({
          where: { id: existingAlert.notificationId },
          data: { userId: newOwnerId },
        });
      }

      // Activity Notification: OWNER_CHANGED
      const { dealTitle, recipientUserIds } = await resolveDealNotificationRecipients(tx, {
        dealId,
        actorId,
        ownerId: newOwnerId,
      });
      const notifications = await buildPersonalizedNotifications(tx, {
        dealId,
        dealTitle,
        type: NotificationType.OWNER_CHANGED,
        actorId,
        targetUserId: newOwnerId,
        recipientUserIds,
      });
      await notificationRepository.createActivityNotifications(tx, notifications);

      return mapDealToResponse(updatedDeal);
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Retrieves all active open deals visible to the requesting user for CSV export.
   * Reuses the authoritative repository visibility filter. Excludes soft-deleted and closed (WON/LOST) deals.
   */
  async getOpenDealsForExport(
    user: AuthUser
  ): Promise<Array<{ company: { name: string }; stage: DealStage; value: Prisma.Decimal }>> {
    const visibilityFilter = this.buildVisibilityFilter(user, false);

    return prisma.deal.findMany({
      where: {
        AND: [
          visibilityFilter,
          {
            stage: {
              in: [
                DealStage.NEW,
                DealStage.QUALIFIED,
                DealStage.PROPOSAL,
                DealStage.NEGOTIATION,
              ],
            },
          },
        ],
      },
      select: {
        company: {
          select: {
            name: true,
          },
        },
        stage: true,
        value: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Retrieves all immutable history events for a deal, ordered newest-first.
   */
  async getDealHistory(dealId: string): Promise<DealHistoryResponse[]> {
    return prisma.dealHistory.findMany({
      where: { dealId },
      select: dealHistorySelect,
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const dealRepository = new DealRepository();
