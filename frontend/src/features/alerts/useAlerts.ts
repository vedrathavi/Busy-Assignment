import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlertsApi, getAlertsCountApi, dismissAlertApi } from './alerts.api';
import { AlertCountResponse, OverdueAlertItem } from './alerts.types';
import { useAuth } from '@/features/auth/AuthContext';

export function useAlerts(status: 'all' | 'active' | 'dismissed' = 'active') {
  const { user } = useAuth();
  return useQuery<OverdueAlertItem[], Error>({
    queryKey: ['alerts', user?.id, status],
    queryFn: () => getAlertsApi(status),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000, // Poll every 30s
    enabled: Boolean(user?.id),
  });
}

export function useAlertsCount() {
  const { user } = useAuth();
  return useQuery<AlertCountResponse, Error>({
    queryKey: ['alerts', 'count', user?.id],
    queryFn: getAlertsCountApi,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    enabled: Boolean(user?.id),
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dealId: string) => dismissAlertApi(dealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
