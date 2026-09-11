import { AuthUser } from '../auth/auth.types';
import { dashboardRepository } from './dashboard.repository';
import { DashboardData } from './dashboard.types';

export class DashboardService {
  /**
   * Retrieves dashboard analytics data for the authenticated user.
   * Scoped to manager team or sales rep owned/collaborated deals.
   */
  async getDashboard(user: AuthUser): Promise<DashboardData> {
    return dashboardRepository.getDashboardMetrics(user);
  }
}

export const dashboardService = new DashboardService();
