import { prisma } from '../../database/prisma';
import { DealStage, Prisma, UserRole } from '@prisma/client';
import { UserListQuery, UserProfileResponse, UserSummary } from './user.types';
import { AuthUser } from '../auth/auth.types';

export class UserRepository {
  /**
   * Retrieves all users belonging to the specified team.
   * Safe fields only - NEVER exposes passwordHash.
   */
  async findTeamUsers(
    teamId: string,
    organizationId: string,
    query?: UserListQuery
  ): Promise<UserSummary[]> {
    const where: Prisma.UserWhereInput = {
      teamId,
      organizationId,
      ...(query?.role ? { role: query.role } : {}),
      ...(query?.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Retrieves a single user within the team and aggregates pipeline performance stats.
   * Scoped by authorization to avoid IDOR data leakage.
   */
  async findUserProfileById(
    userId: string,
    teamId: string,
    organizationId: string,
    requester: AuthUser
  ): Promise<UserProfileResponse | null> {
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        teamId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!targetUser) {
      return null;
    }

    // Build deal visibility filter based on requester role to prevent IDOR leaks
    let dealFilter: Prisma.DealWhereInput;

    if (requester.role === UserRole.MANAGER || requester.id === userId) {
      // Manager or user viewing their own profile has full visibility of their deals
      dealFilter = {
        teamId,
        ownerId: userId,
        deletedAt: null,
      };
    } else {
      // Sales rep viewing another rep's profile can only see deals they collaborate on
      dealFilter = {
        teamId,
        ownerId: userId,
        deletedAt: null,
        collaborators: {
          some: {
            userId: requester.id,
          },
        },
      };
    }

    // Open deals (not WON, not LOST)
    const openDealsFilter: Prisma.DealWhereInput = {
      ...dealFilter,
      stage: {
        notIn: [DealStage.WON, DealStage.LOST],
      },
    };

    const [openDealsCount, openDealsSum, wonDealsCount, totalDealsCount] =
      await Promise.all([
        prisma.deal.count({ where: openDealsFilter }),
        prisma.deal.aggregate({
          where: openDealsFilter,
          _sum: { value: true },
        }),
        prisma.deal.count({
          where: {
            ...dealFilter,
            stage: DealStage.WON,
          },
        }),
        prisma.deal.count({ where: dealFilter }),
      ]);

    const pipelineValue = openDealsSum._sum.value
      ? openDealsSum._sum.value.toFixed(2)
      : '0.00';

    return {
      user: targetUser,
      stats: {
        openDeals: openDealsCount,
        pipelineValue,
        wonDeals: wonDealsCount,
        totalDeals: totalDealsCount,
      },
    };
  }
}

export const userRepository = new UserRepository();
