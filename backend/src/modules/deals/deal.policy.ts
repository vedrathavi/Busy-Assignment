import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';

export class DealPolicy {
  /**
   * Evaluates if the user can create a deal with the specified owner.
   * - A Sales Rep can only create a deal owned by themselves.
   * - A Manager must assign ownership to a Sales Rep (cannot assign to themselves).
   */
  canCreate(user: AuthUser, targetOwnerId?: string): boolean {
    if (user.role === UserRole.SALES_REP) {
      return !targetOwnerId || targetOwnerId === user.id;
    }
    if (user.role === UserRole.MANAGER) {
      // Manager cannot assign themselves as deal owner
      if (targetOwnerId && targetOwnerId === user.id) {
        return false;
      }
      return true;
    }
    return false;
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

  /**
   * Evaluates if the user has permission to add or remove collaborators on a deal.
   * - Manager: Allowed on any team deal.
   * - Deal Owner: Allowed.
   * - Collaborator: FORBIDDEN (collaborators cannot manage other collaborators).
   * - Unassociated Rep: FORBIDDEN.
   */
  canManageCollaborators(user: AuthUser, deal: { teamId: string; ownerId: string }): boolean {
    if (user.teamId !== deal.teamId) {
      return false;
    }
    if (user.role === UserRole.MANAGER) {
      return true;
    }
    return deal.ownerId === user.id;
  }

  /**
   * Evaluates if the user has permission to add notes to a deal.
   * - Manager: Allowed on any team deal.
   * - Deal Owner: Allowed.
   * - Deal Collaborator: Allowed.
   * - Unassociated Rep: FORBIDDEN.
   */
  canAddNote(
    user: AuthUser,
    deal: { teamId: string; ownerId: string; collaborators?: Array<{ userId: string }> }
  ): boolean {
    return this.canEdit(user, deal);
  }

  /**
   * Evaluates if the user has permission to view a deal's immutable history.
   * - Manager: Allowed on any team deal (including soft-deleted deals).
   * - Deal Owner: Allowed (including soft-deleted deals).
   * - Deal Collaborator: Allowed (including soft-deleted deals).
   * - Unassociated Rep: FORBIDDEN.
   */
  canViewHistory(
    user: AuthUser,
    deal: { teamId: string; ownerId: string; collaborators?: Array<{ userId: string }> }
  ): boolean {
    return this.canView(user, deal);
  }
}

export const dealPolicy = new DealPolicy();
