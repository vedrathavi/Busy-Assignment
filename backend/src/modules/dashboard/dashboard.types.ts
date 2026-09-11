import { DealStage } from '@prisma/client';

export interface StageCount {
  stage: DealStage;
  count: number;
}

export interface OwnerDealCount {
  ownerId: string;
  ownerName: string;
  count: number;
}

export interface WeeklyWonCount {
  weekStart: string; // "YYYY-MM-DD" (Monday)
  weekEnd: string;   // "YYYY-MM-DD" (Sunday)
  count: number;
}

export interface DashboardData {
  openDeals: number;
  weightedPipeline: string; // Exact decimal string e.g. "485000.00"
  wonThisMonth: number;
  lostThisMonth: number;
  openDealsByStage: StageCount[];
  openDealsByOwner: OwnerDealCount[];
  wonPerWeek: WeeklyWonCount[];
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardData;
}
