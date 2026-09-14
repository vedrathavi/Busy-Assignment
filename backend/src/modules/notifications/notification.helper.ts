import { Prisma, UserRole, NotificationType, DealStage } from '@prisma/client';

export interface ResolveRecipientsParams {
  dealId: string;
  teamId?: string;
  actorId: string;
  ownerId?: string;
  additionalRecipientIds?: string[];
  excludedRecipientIds?: string[];
}

export interface ResolvedRecipientsResult {
  dealTitle: string;
  recipientUserIds: string[];
}

/**
 * Server-side recipient resolution for deal activity events.
 * Resolves:
 * - Deal owner (effective owner for owner changes)
 * - Current active collaborators (including newly added, excluding removed)
 * - Team-wide Managers
 * Excludes:
 * - The actor who performed the action
 * - Unrelated Sales Reps
 */
export async function resolveDealNotificationRecipients(
  tx: Prisma.TransactionClient,
  params: ResolveRecipientsParams
): Promise<ResolvedRecipientsResult> {
  const deal = await tx.deal.findUnique({
    where: { id: params.dealId },
    select: {
      teamId: true,
      ownerId: true,
      title: true,
      collaborators: { select: { userId: true } },
    },
  });

  if (!deal) {
    return { dealTitle: '', recipientUserIds: [] };
  }

  const effectiveTeamId = params.teamId || deal.teamId;
  const effectiveOwnerId = params.ownerId || deal.ownerId;

  // Query all Managers for the deal's team
  const managers = await tx.user.findMany({
    where: {
      teamId: effectiveTeamId,
      role: UserRole.MANAGER,
    },
    select: { id: true },
  });

  const recipientSet = new Set<string>();

  // 1. Effective owner
  if (effectiveOwnerId) {
    recipientSet.add(effectiveOwnerId);
  }

  // 2. Existing collaborators
  deal.collaborators.forEach((c) => recipientSet.add(c.userId));

  // 3. Newly added collaborator(s)
  params.additionalRecipientIds?.forEach((id) => recipientSet.add(id));

  // 4. Team managers
  managers.forEach((m) => recipientSet.add(m.id));

  // 5. Exclude removed collaborator(s)
  params.excludedRecipientIds?.forEach((id) => recipientSet.delete(id));

  // 6. Invariant: Never notify the actor who performed the action
  recipientSet.delete(params.actorId);

  return {
    dealTitle: deal.title,
    recipientUserIds: Array.from(recipientSet),
  };
}

export interface BuildPersonalizedNotificationsParams {
  dealId: string;
  dealTitle: string;
  type: NotificationType;
  actorId: string;
  targetUserId?: string;
  targetStage?: DealStage | string;
  reason?: string;
  ownerId?: string;
  recipientUserIds: string[];
}

/**
 * Builds personalized notification records for each recipient:
 * - 2nd person for directly targeted recipients ("You were added as a collaborator by Sarah Jenkins")
 * - 3rd person for other stakeholders ("Sarah Jenkins added Alex Rivera as a collaborator")
 */
export async function buildPersonalizedNotifications(
  tx: Prisma.TransactionClient,
  params: BuildPersonalizedNotificationsParams
): Promise<
  Array<{
    userId: string;
    dealId: string;
    type: NotificationType;
    title: string;
    message: string;
  }>
> {
  if (!params.recipientUserIds || params.recipientUserIds.length === 0) {
    return [];
  }

  // Fetch actor's name
  const actor = await tx.user.findUnique({
    where: { id: params.actorId },
    select: { name: true },
  });
  const actorName = actor?.name || 'A team member';

  // Fetch target user's name if targetUserId is present
  let targetUserName = 'a team member';
  if (params.targetUserId) {
    const targetUser = await tx.user.findUnique({
      where: { id: params.targetUserId },
      select: { name: true },
    });
    if (targetUser?.name) {
      targetUserName = targetUser.name;
    }
  }

  return params.recipientUserIds.map((recipientId) => {
    const isRecipientTarget = Boolean(params.targetUserId && recipientId === params.targetUserId);
    const isRecipientOwner = Boolean(params.ownerId && recipientId === params.ownerId);

    switch (params.type) {
      case NotificationType.COLLABORATOR_ADDED:
        if (isRecipientTarget) {
          return {
            userId: recipientId,
            dealId: params.dealId,
            type: params.type,
            title: 'Added as Collaborator',
            message: `You were added as a collaborator to "${params.dealTitle}" by ${actorName}.`,
          };
        }
        return {
          userId: recipientId,
          dealId: params.dealId,
          type: params.type,
          title: 'Collaborator Added',
          message: `${actorName} added ${targetUserName} as a collaborator to "${params.dealTitle}".`,
        };

      case NotificationType.COLLABORATOR_REMOVED:
        return {
          userId: recipientId,
          dealId: params.dealId,
          type: params.type,
          title: 'Collaborator Removed',
          message: `${actorName} removed ${targetUserName} as a collaborator from "${params.dealTitle}".`,
        };

      case NotificationType.OWNER_CHANGED:
        if (isRecipientTarget) {
          return {
            userId: recipientId,
            dealId: params.dealId,
            type: params.type,
            title: 'Deal Assigned to You',
            message: `You were assigned as the owner of "${params.dealTitle}" by ${actorName}.`,
          };
        }
        return {
          userId: recipientId,
          dealId: params.dealId,
          type: params.type,
          title: 'Deal Owner Changed',
          message: `${actorName} reassigned "${params.dealTitle}" to ${targetUserName}.`,
        };

      case NotificationType.DEAL_STAGE_ADVANCED:
        return {
          userId: recipientId,
          dealId: params.dealId,
          type: params.type,
          title: 'Deal Stage Advanced',
          message: params.targetStage
            ? `${actorName} advanced "${params.dealTitle}" to ${params.targetStage}.`
            : `${actorName} advanced "${params.dealTitle}".`,
        };

      case NotificationType.DEAL_STAGE_REGRESSED:
        return {
          userId: recipientId,
          dealId: params.dealId,
          type: params.type,
          title: 'Deal Stage Moved Backward',
          message: params.targetStage
            ? `${actorName} moved "${params.dealTitle}" back to ${params.targetStage}${params.reason ? ` (Reason: "${params.reason}")` : ''}.`
            : `${actorName} moved "${params.dealTitle}" back.`,
        };

      case NotificationType.DEAL_WON:
        return {
          userId: recipientId,
          dealId: params.dealId,
          type: params.type,
          title: 'Deal Won!',
          message: `${actorName} marked "${params.dealTitle}" as Won.`,
        };

      case NotificationType.DEAL_LOST:
        return {
          userId: recipientId,
          dealId: params.dealId,
          type: params.type,
          title: 'Deal Lost',
          message: `${actorName} marked "${params.dealTitle}" as Lost${params.reason ? ` (Reason: "${params.reason}")` : ''}.`,
        };

      case NotificationType.DEAL_REOPENED:
        return {
          userId: recipientId,
          dealId: params.dealId,
          type: params.type,
          title: 'Deal Reopened',
          message: params.targetStage
            ? `${actorName} reopened "${params.dealTitle}" to ${params.targetStage}.`
            : `${actorName} reopened "${params.dealTitle}".`,
        };

      case NotificationType.NOTE_ADDED:
        return {
          userId: recipientId,
          dealId: params.dealId,
          type: params.type,
          title: 'Note Added',
          message: `${actorName} added a note to "${params.dealTitle}".`,
        };

      case NotificationType.DEAL_CREATED:
        if (isRecipientOwner) {
          return {
            userId: recipientId,
            dealId: params.dealId,
            type: params.type,
            title: 'New Deal Assigned',
            message: `${actorName} created deal "${params.dealTitle}" and assigned it to you.`,
          };
        }
        return {
          userId: recipientId,
          dealId: params.dealId,
          type: params.type,
          title: 'New Deal Created',
          message: `${actorName} created deal "${params.dealTitle}".`,
        };

      default:
        return {
          userId: recipientId,
          dealId: params.dealId,
          type: params.type,
          title: 'Deal Activity',
          message: `Activity on "${params.dealTitle}".`,
        };
    }
  });
}

