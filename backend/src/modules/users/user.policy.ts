import { AuthUser } from '../auth/auth.types';

export class UserPolicy {
  /**
   * Any authenticated user can view the team directory of their assigned team.
   */
  canListTeamUsers(_user: AuthUser): boolean {
    return true;
  }

  /**
   * Any authenticated user can view profiles of members belonging to the same team/org.
   */
  canViewUserProfile(user: AuthUser, targetTeamId: string): boolean {
    return user.teamId === targetTeamId;
  }
}

export const userPolicy = new UserPolicy();
