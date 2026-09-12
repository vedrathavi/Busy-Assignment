import { AuthUser } from '../auth/auth.types';
import { userRepository, UserRepository } from './user.repository';
import { userPolicy, UserPolicy } from './user.policy';
import { UserListQuery, UserProfileResponse, UserSummary } from './user.types';
import { NotFoundError, ForbiddenError } from '../../errors/app-error';

export class UserService {
  constructor(
    private readonly repo: UserRepository = userRepository,
    private readonly policy: UserPolicy = userPolicy
  ) {}

  async listUsers(user: AuthUser, query?: UserListQuery): Promise<UserSummary[]> {
    if (!this.policy.canListTeamUsers(user)) {
      throw new ForbiddenError('You do not have permission to view team members');
    }

    return this.repo.findTeamUsers(user.teamId, user.organizationId, query);
  }

  async getUserProfile(user: AuthUser, targetUserId: string): Promise<UserProfileResponse> {
    const profile = await this.repo.findUserProfileById(
      targetUserId,
      user.teamId,
      user.organizationId,
      user
    );

    if (!profile) {
      throw new NotFoundError('User not found or does not belong to your team');
    }

    return profile;
  }
}

export const userService = new UserService();
