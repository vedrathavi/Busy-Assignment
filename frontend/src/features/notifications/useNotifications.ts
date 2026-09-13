import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import {
  getNotificationsApi,
  getNotificationCountApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from './notifications.api';
import {
  ActivityNotificationItem,
  NotificationCountResponse,
} from './notifications.types';

/**
 * Lightweight periodic polling hook for activity notifications count.
 * - Polls ONLY GET /api/notifications/count every 30 seconds while tab is active.
 * - Pauses polling when the browser tab is hidden/inactive.
 * - Refetches count on window/tab focus.
 * - Only invalidates the notification list when unreadCount actually changes.
 * - Never downloads the full notification list on a timer.
 */
export function useNotificationCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const prevUnreadCountRef = useRef<number | undefined>(undefined);

  const query = useQuery<NotificationCountResponse, Error>({
    queryKey: ['notifications', 'count', user?.id],
    queryFn: () => getNotificationCountApi(),
    enabled: Boolean(user?.id),
    refetchInterval: 30000, // 30s lightweight short-polling
    refetchIntervalInBackground: false, // pauses when browser tab/window is hidden
    refetchOnWindowFocus: true, // refetches on window/tab focus
    staleTime: 10000,
  });

  useEffect(() => {
    if (query.data?.unreadCount !== undefined) {
      if (
        prevUnreadCountRef.current !== undefined &&
        query.data.unreadCount !== prevUnreadCountRef.current
      ) {
        // Invalidate notification list only when unreadCount changes
        queryClient.invalidateQueries({ queryKey: ['notifications', 'list', user?.id] });
      }
      prevUnreadCountRef.current = query.data.unreadCount;
    }
  }, [query.data?.unreadCount, queryClient, user?.id]);

  return query;
}

/**
 * Fetches activity notifications list.
 * Note: Does NOT periodically poll. Only fetched when opened or invalidated upon count change/mutations.
 */
export function useNotifications(status: 'all' | 'unread' | 'read' = 'all') {
  const { user } = useAuth();

  return useQuery<ActivityNotificationItem[], Error>({
    queryKey: ['notifications', 'list', user?.id, status],
    queryFn: () => getNotificationsApi({ status }),
    enabled: Boolean(user?.id),
    staleTime: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => markNotificationReadApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'count', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list', user?.id] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: () => markAllNotificationsReadApi(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'count', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list', user?.id] });
    },
  });
}
