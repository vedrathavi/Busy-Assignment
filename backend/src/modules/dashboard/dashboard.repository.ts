import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AuthUser } from '../auth/auth.types';
import { dealRepository } from '../deals/deal.repository';
import { STAGE_PROBABILITY } from '../deals/deal.types';
import { DealStage } from '@prisma/client';
import { DashboardData, StageCount, OwnerDealCount, WeeklyWonCount } from './dashboard.types';

const OPEN_STAGES: DealStage[] = [
  DealStage.NEW,
  DealStage.QUALIFIED,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
];

function getMondayOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export class DashboardRepository {
  /**
   * Computes aggregated dashboard metrics for the given user's visibility scope.
   * Performs all aggregations at the database level.
   */
  async getDashboardMetrics(user: AuthUser, referenceDate: Date = new Date()): Promise<DashboardData> {
    const visibilityFilter = dealRepository.buildVisibilityFilter(user, false);

    // 1. Half-open monthly bounds: [startOfMonth, startOfNextMonth)
    const startOfMonth = new Date(
      Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1, 0, 0, 0, 0)
    );
    const startOfNextMonth = new Date(
      Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1, 0, 0, 0, 0)
    );

    // 2. Half-open 8-week bounds: [oldestMonday, nextMondayAfterCurrentWeek)
    const currentWeekMonday = getMondayOfIsoWeek(referenceDate);
    const weeklyBuckets: {
      start: Date;
      end: Date;
      weekStart: string;
      weekEnd: string;
      count: number;
    }[] = [];

    for (let i = 7; i >= 0; i--) {
      const bucketStart = new Date(currentWeekMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const sunday = new Date(bucketStart.getTime() + 6 * 24 * 60 * 60 * 1000);

      weeklyBuckets.push({
        start: bucketStart,
        end: bucketEnd,
        weekStart: bucketStart.toISOString().slice(0, 10),
        weekEnd: sunday.toISOString().slice(0, 10),
        count: 0,
      });
    }

    const oldestMonday = weeklyBuckets[0].start;
    const nextMondayAfterCurrentWeek = weeklyBuckets[weeklyBuckets.length - 1].end;

    // Filter for active open deals within user's visibility scope
    const openDealsWhere: Prisma.DealWhereInput = {
      AND: [
        visibilityFilter,
        {
          stage: {
            in: OPEN_STAGES,
          },
        },
      ],
    };

    // 3. Run parallel database aggregations in a single transaction
    const [
      stageGroups,
      ownerGroups,
      wonThisMonth,
      lostThisMonth,
      wonDealsIn8Weeks,
    ] = await prisma.$transaction([
      // A. Stage groups with counts and sums for weighted pipeline
      prisma.deal.groupBy({
        by: ['stage'],
        where: openDealsWhere,
        _count: {
          _all: true,
        },
        _sum: {
          value: true,
        },
      }),

      // B. Owner groups for open deals
      prisma.deal.groupBy({
        by: ['ownerId'],
        where: openDealsWhere,
        _count: {
          _all: true,
        },
        orderBy: {
          _count: {
            ownerId: 'desc',
          },
        },
      }),

      // C. Deals won this month (using closedAt with half-open interval)
      prisma.deal.count({
        where: {
          AND: [
            visibilityFilter,
            { stage: DealStage.WON },
            { closedAt: { gte: startOfMonth, lt: startOfNextMonth } },
          ],
        },
      }),

      // D. Deals lost this month (using closedAt with half-open interval)
      prisma.deal.count({
        where: {
          AND: [
            visibilityFilter,
            { stage: DealStage.LOST },
            { closedAt: { gte: startOfMonth, lt: startOfNextMonth } },
          ],
        },
      }),

      // E. Won deals in the 8-week window for weekly trend
      prisma.deal.findMany({
        where: {
          AND: [
            visibilityFilter,
            { stage: DealStage.WON },
            { closedAt: { gte: oldestMonday, lt: nextMondayAfterCurrentWeek } },
          ],
        },
        select: {
          closedAt: true,
        },
      }),
    ]);

    // 4. Process Stage Counts & Weighted Pipeline (Decimal-safe)
    let totalOpenDeals = 0;
    let totalWeightedPipeline = new Prisma.Decimal(0);
    const stageCountMap = new Map<DealStage, { count: number; sumValue: Prisma.Decimal }>();

    for (const group of stageGroups) {
      const count = group._count._all;
      const sumValue = group._sum.value ?? new Prisma.Decimal(0);
      stageCountMap.set(group.stage, { count, sumValue });
    }

    const openDealsByStage: StageCount[] = OPEN_STAGES.map((stage) => {
      const entry = stageCountMap.get(stage) || { count: 0, sumValue: new Prisma.Decimal(0) };
      totalOpenDeals += entry.count;

      const prob = new Prisma.Decimal(STAGE_PROBABILITY[stage] ?? 0);
      const stageWeighted = entry.sumValue.mul(prob);
      totalWeightedPipeline = totalWeightedPipeline.plus(stageWeighted);

      return {
        stage,
        count: entry.count,
      };
    });

    // 5. Process Owner Counts (Resolve owner names safely)
    const ownerIds = ownerGroups.map((g) => g.ownerId);
    let openDealsByOwner: OwnerDealCount[] = [];

    if (ownerIds.length > 0) {
      const owners = await prisma.user.findMany({
        where: {
          id: { in: ownerIds },
        },
        select: {
          id: true,
          name: true,
        },
      });

      const ownerNameMap = new Map(owners.map((o) => [o.id, o.name]));

      openDealsByOwner = ownerGroups.map((g) => ({
        ownerId: g.ownerId,
        ownerName: ownerNameMap.get(g.ownerId) ?? 'Unknown User',
        count: g._count._all,
      }));
    }

    // 6. Process Won Deals Per Week (Bin into 8 half-open buckets)
    for (const deal of wonDealsIn8Weeks) {
      if (!deal.closedAt) continue;
      const closedTime = deal.closedAt.getTime();

      for (const bucket of weeklyBuckets) {
        if (closedTime >= bucket.start.getTime() && closedTime < bucket.end.getTime()) {
          bucket.count++;
          break;
        }
      }
    }

    const wonPerWeek: WeeklyWonCount[] = weeklyBuckets.map((b) => ({
      weekStart: b.weekStart,
      weekEnd: b.weekEnd,
      count: b.count,
    }));

    return {
      openDeals: totalOpenDeals,
      weightedPipeline: totalWeightedPipeline.toFixed(2),
      wonThisMonth,
      lostThisMonth,
      openDealsByStage,
      openDealsByOwner,
      wonPerWeek,
    };
  }
}

export const dashboardRepository = new DashboardRepository();
