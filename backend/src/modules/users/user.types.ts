import { UserRole } from '@prisma/client';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

export interface UserProfileStats {
  openDeals: number;
  pipelineValue: string;
  wonDeals: number;
  totalDeals: number;
}

export interface UserProfileResponse {
  user: UserSummary;
  stats: UserProfileStats;
}

export interface UserListQuery {
  role?: UserRole;
  search?: string;
}
