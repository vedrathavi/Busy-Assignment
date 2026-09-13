import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiCheck,
  FiAlertTriangle,
  FiChevronRight,
  FiArrowRight,
} from 'react-icons/fi';
import { LuCheckCheck } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useNotificationCount,
  useRecentNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from './useNotifications';
import { useAlertsCount } from '@/features/alerts/useAlerts';
import { ActivityNotificationItem } from './notifications.types';
import { cn } from '@/lib/utils';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Lightweight 30s count polling (pauses in background tab)
  const { data: countData } = useNotificationCount();
  const { data: alertsCountData } = useAlertsCount();

  // Lightweight recent activity preview: only requests 5 items when dropdown is open
  const { data: recentNotifications, isLoading } = useRecentNotifications(5);

  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();

  const unreadActivity = countData?.unreadCount ?? 0;
  const overdueAlerts = alertsCountData?.count ?? 0;
  const totalBadge = unreadActivity + overdueAlerts;

  const handleNotificationClick = (item: ActivityNotificationItem) => {
    if (!item.readAt) {
      markReadMutation.mutate(item.id);
    }
    setIsOpen(false);
    if (item.dealId) {
      navigate(`/deals/${item.dealId}`);
    } else {
      navigate('/alerts');
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0 text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-[rgba(28,28,28,0.05)] rounded-full border border-[rgba(28,28,28,0.1)]"
          aria-label="Activity and alerts"
        >
          <FiBell className="h-4 w-4" />
          {totalBadge > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-[#fcfbf8] bg-[#1c1c1c] shadow-xs animate-in zoom-in-50"
            >
              {totalBadge > 99 ? '99+' : totalBadge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 rounded-xl border-[#dedcd5] bg-white p-0 shadow-focus-soft"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eceae4] px-4 py-3 bg-[#faf9f6]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1c1c1c]">Notifications</span>
            {unreadActivity > 0 && (
              <Badge variant="secondary" className="text-[0.625rem] px-1.5 py-0 bg-[#eceae4] text-[#1c1c1c]">
                {unreadActivity} unread
              </Badge>
            )}
          </div>
          {unreadActivity > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="h-7 text-xs text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-[#eceae4] px-2"
            >
              <LuCheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Activity Items List (Compact preview max 5) */}
        <div className="max-h-80 overflow-y-auto divide-y divide-[#eceae4]/60 bg-white">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-9 w-full rounded-lg bg-[#eceae4]/60" />
              <Skeleton className="h-9 w-full rounded-lg bg-[#eceae4]/60" />
              <Skeleton className="h-9 w-full rounded-lg bg-[#eceae4]/60" />
            </div>
          ) : !recentNotifications || recentNotifications.length === 0 ? (
            <div className="p-6 text-center">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#eceae4] text-[#5f5f5d] mb-2">
                <FiBell className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-[#1c1c1c]">You're all caught up</p>
              <p className="text-[0.6875rem] text-[#8c8b87] mt-0.5">
                Deal activity from your team will appear here.
              </p>
            </div>
          ) : (
            (recentNotifications || []).map((item: ActivityNotificationItem) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className="group flex items-start justify-between gap-2.5 px-3.5 py-2.5 transition-colors cursor-pointer bg-white hover:bg-[#faf9f6]"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {/* Status Indicator */}
                  <div className="mt-1 shrink-0">
                    {!item.readAt ? (
                      <Tooltip content="Unread notification" side="top">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-600 shadow-xs" />
                      </Tooltip>
                    ) : (
                      <Tooltip content="Read" side="top">
                        <LuCheckCheck className="h-3.5 w-3.5 text-[#8c8b87]" />
                      </Tooltip>
                    )}
                  </div>

                  {/* Message & Time */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {item.message?.includes('\n') ? (
                      <>
                        <p
                          className={cn(
                            'text-xs leading-snug',
                            !item.readAt ? 'font-semibold text-[#1c1c1c]' : 'font-normal text-[#5f5f5d]'
                          )}
                        >
                          {item.message.split('\n')[0]}
                        </p>
                        <p className="text-[11px] italic text-[#5f5f5d] bg-[#f7f4ed] rounded px-2 py-1 border-l-2 border-[#1c1c1c]/30">
                          {item.message.split('\n').slice(1).join(' ')}
                        </p>
                      </>
                    ) : (
                      <p
                        className={cn(
                          'text-xs leading-snug line-clamp-2',
                          !item.readAt ? 'font-semibold text-[#1c1c1c]' : 'font-normal text-[#5f5f5d]'
                        )}
                      >
                        {item.message}
                      </p>
                    )}
                    <span className="text-[10px] text-[#8c8b87] mt-0.5 block">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Mark as read quick button */}
                {!item.readAt && (
                  <Tooltip content="Mark as read" side="top">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(item.id);
                      }}
                      aria-label="Mark as read"
                      className="shrink-0 p-1 text-[#8c8b87] hover:text-[#1c1c1c] hover:bg-[#eceae4] rounded transition-colors cursor-pointer"
                    >
                      <FiCheck className="h-3.5 w-3.5" />
                    </button>
                  </Tooltip>
                )}
              </div>
            ))
          )}
        </div>

        {/* Overdue Deals Callout Banner (Goal 10 DealAlerts) */}
        {overdueAlerts > 0 && (
          <div className="border-t border-[#eceae4] bg-rose-50 px-3.5 py-2">
            <Link
              to="/alerts?tab=overdue"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between text-xs text-rose-900 hover:text-rose-950 font-medium"
            >
              <div className="flex items-center gap-1.5">
                <FiAlertTriangle className="h-3.5 w-3.5 text-rose-700 shrink-0" />
                <span>{overdueAlerts} overdue deal{overdueAlerts > 1 ? 's' : ''}</span>
              </div>
              <span className="flex items-center text-[0.6875rem] text-rose-800 underline">
                View <FiChevronRight className="h-3 w-3 ml-0.5" />
              </span>
            </Link>
          </div>
        )}

        {/* Footer */}
        <DropdownMenuSeparator className="m-0 bg-[#eceae4]" />
        <div className="p-2 bg-[#faf9f6] text-center">
          <Link
            to="/alerts"
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center justify-center gap-1 w-full py-1 text-xs font-medium text-[#1c1c1c] hover:underline"
          >
            <span>View all activity</span>
            <FiArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
