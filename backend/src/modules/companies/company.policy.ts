import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';

export class CompanyPolicy {
  /**
   * Evaluates if the user has permission to create a company with the given owner.
   * - A Sales Rep can only create a company owned by themselves.
   * - A Manager can assign ownership to any Sales Rep in their team.
   */
  canCreate(user: AuthUser, targetOwnerId?: string): boolean {
    if (!targetOwnerId || targetOwnerId === user.id) {
      return true;
    }
    return user.role === UserRole.MANAGER;
  }

  /**
   * Evaluates if the user has permission to edit a company.
   * - Manager can edit any company in their team.
   * - Sales Rep can edit only companies they own.
   * (Deal collaboration grants VIEW visibility, NOT EDIT permission).
   */
  canEdit(user: AuthUser, company: { teamId: string; ownerId: string }): boolean {
    if (user.teamId !== company.teamId) {
      return false;
    }
    if (user.role === UserRole.MANAGER) {
      return true;
    }
    return company.ownerId === user.id;
  }

  /**
   * Evaluates if the user has permission to reassign company ownership.
   * - Only Managers can reassign company ownership.
   */
  canReassignOwner(user: AuthUser): boolean {
    return user.role === UserRole.MANAGER;
  }

  /**
   * Evaluates if the user has permission to archive a company.
   * - Manager can archive any company in their team.
   * - Sales Rep can archive only companies they own.
   */
  canArchive(user: AuthUser, company: { teamId: string; ownerId: string }): boolean {
    if (user.teamId !== company.teamId) {
      return false;
    }
    if (user.role === UserRole.MANAGER) {
      return true;
    }
    return company.ownerId === user.id;
  }

  /**
   * Evaluates if the user has permission to restore an archived company.
   * - Manager can restore any company in their team.
   * - Sales Rep can restore only companies they own.
   */
  canRestore(user: AuthUser, company: { teamId: string; ownerId: string }): boolean {
    if (user.teamId !== company.teamId) {
      return false;
    }
    if (user.role === UserRole.MANAGER) {
      return true;
    }
    return company.ownerId === user.id;
  }
}

export const companyPolicy = new CompanyPolicy();
