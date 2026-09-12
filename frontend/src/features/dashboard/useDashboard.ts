import { useQuery } from '@tanstack/react-query';
import { getDashboardMetricsApi } from './dashboard.api';
import { DashboardData } from './dashboard.types';
import { useAuth } from '@/features/auth/AuthContext';

export function useDashboardMetrics() {
  const { user } = useAuth();
  return useQuery<DashboardData, Error>({
    queryKey: ['dashboard', 'metrics', user?.id],
    queryFn: getDashboardMetricsApi,
    staleTime: 30 * 1000, // 30 seconds fresh
    refetchOnWindowFocus: true,
    enabled: Boolean(user?.id),
  });
}
