import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';

export class DealPolicy {
  /**
   * Evaluates if the user can create a deal with the specified owner.
   * - Sales Rep can only create deals owned by themselves.
   * - Manager can create and assign to any Sales Rep in their team.
   */
  canCreate(user: AuthUser, targetOwnerId?: string): boolean {
    if (!targetOwnerId || targetOwnerId === user.id) {
      return true;
    }
    return user.role === UserRole.MANAGER;
  }

  /**
   * Evaluates if the user has permission to view a deal.
   * - Manager: Full team visibility.
   * - Sales Rep: Must be deal owner OR collaborator.
   */
  canView(
    user: AuthUser,
    deal: { teamId: string; ownerId: string; collaborators?: Array<{ userId: string }> }
  ): boolean {
    if (user.teamId !== deal.teamId) {
      return false;
    }
    if (user.role === UserRole.MANAGER) {
      return true;
    }
    if (deal.ownerId === user.id) {
      return true;
    }
    return deal.collaborators?.some((c) => c.userId === user.id) ?? false;
  }

  /**
   * Evaluates if the user has permission to edit mutable fields on a deal.
   * - Manager: Allowed on any team deal.
   * - Sales Rep: Allowed if deal owner OR collaborator (collaborators can act on and update deals).
   */
  canEdit(
    user: AuthUser,
    deal: { teamId: string; ownerId: string; collaborators?: Array<{ userId: string }> }
  ): boolean {
    if (user.teamId !== deal.teamId) {
      return false;
    }
    if (user.role === UserRole.MANAGER) {
      return true;
    }
    if (deal.ownerId === user.id) {
      return true;
    }
    return deal.collaborators?.some((c) => c.userId === user.id) ?? false;
  }

  /**
   * Evaluates if the user has permission to reassign deal ownership.
   * - Restricted strictly to Sales Managers.
   */
  canReassignOwner(user: AuthUser): boolean {
    return user.role === UserRole.MANAGER;
  }

  /**
   * Evaluates if the user has permission to transition a deal's lifecycle stage.
   * - Manager, Deal Owner, or Deal Collaborator.
   */
  canTransitionStage(
    user: AuthUser,
    deal: { teamId: string; ownerId: string; collaborators?: Array<{ userId: string }> }
  ): boolean {
    return this.canEdit(user, deal);
  }

  /**
   * Evaluates if the user has permission to reopen a closed deal.
   * - Restricted strictly to Sales Managers.
   */
  canReopen(user: AuthUser): boolean {
    return user.role === UserRole.MANAGER;
  }

  /**
   * Evaluates if the user has permission to soft-delete a deal.
   * - Manager: Allowed on any team deal.
   * - Sales Rep: Allowed ONLY if they are the Deal Owner.
   */
  canDelete(user: AuthUser, deal: { teamId: string; ownerId: string }): boolean {
    if (user.teamId !== deal.teamId) {
      return false;
    }
    if (user.role === UserRole.MANAGER) {
      return true;
    }
    return deal.ownerId === user.id;
  }
}

export const dealPolicy = new DealPolicy();
