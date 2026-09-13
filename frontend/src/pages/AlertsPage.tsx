import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiGlobe,
  FiCalendar,
  FiCheckCircle,
  FiRefreshCw,
  FiCheck,
  FiBell,
  FiClock,
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { LuCheckCheck } from 'react-icons/lu';
import { useAlerts, useAlertsCount, useDismissAlert } from '@/features/alerts/useAlerts';
import {
  useNotifications,
  useNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notifications/useNotifications';
import { ActivityNotificationItem } from '@/features/notifications/notifications.types';
import { getNotificationVisual } from '@/features/notifications/notificationVisuals';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  PageHeader,
  PageHeaderHeading,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from '@/components/ui/page-header';
import { formatCurrency, formatDate, getDaysOverdue, cn } from '@/lib/utils';

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
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AlertsPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'overdue' ? 'overdue' : 'activity';

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [activityStatusFilter, setActivityStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [activityPage, setActivityPage] = useState<number>(1);

  // Goal 10 Overdue Deal Alerts
  const [alertStatusFilter, setAlertStatusFilter] = useState<'all' | 'active' | 'dismissed'>('active');
  const { data: alertsCountData } = useAlertsCount();
  const {
    data: alerts,
    isLoading: isAlertsLoading,
    isError: isAlertsError,
    error: alertsError,
    refetch: refetchAlerts,
    isFetching: isAlertsFetching,
  } = useAlerts(alertStatusFilter);
  const dismissMutation = useDismissAlert();

  // Deal Activity Notifications (Optional Addon)
  const { data: countData } = useNotificationCount();
  const {
    data: activityData,
    isLoading: isActivityLoading,
    isError: isActivityError,
    error: activityError,
    refetch: refetchActivity,
    isFetching: isActivityFetching,
  } = useNotifications({ status: activityStatusFilter, page: activityPage, limit: 20 });

  const activityNotifications = activityData?.notifications || [];
  const activityPagination = activityData?.pagination || {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();

  // Sync tab with URL search parameter when navigating
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('tab');
    if (t === 'overdue' || t === 'activity') {
      setActiveTab(t);
    }
  }, [location.search]);

  const handleDismiss = (dealId: string) => {
    dismissMutation.mutate(dealId);
  };

  const overdueCount = alertsCountData?.count ?? alerts?.length ?? 0;
  const unreadActivityCount = countData?.unreadCount ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader>
        <PageHeaderHeading>
          <div className="flex items-center gap-2.5">
            <PageHeaderTitle>Activity & Alerts</PageHeaderTitle>
            {unreadActivityCount > 0 && (
              <Badge
                variant="default"
                className="text-xs font-normal px-2.5 py-0.5 bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset"
              >
                {unreadActivityCount} Unread
              </Badge>
            )}
            {overdueCount > 0 && (
              <Badge
                variant="outline"
                className="text-xs font-medium px-2.5 py-0.5 border-rose-200 text-rose-800 bg-rose-50"
              >
                {overdueCount} Overdue
              </Badge>
            )}
          </div>
          <PageHeaderDescription>
            Stay up to date with changes to deals you work on.
          </PageHeaderDescription>
        </PageHeaderHeading>

        <PageHeaderActions>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (activeTab === 'activity' ? refetchActivity() : refetchAlerts())}
            disabled={activeTab === 'activity' ? isActivityFetching : isAlertsFetching}
            className="border-[#eceae4] text-[#1c1c1c] hover:bg-[#eceae4]"
            aria-label="Refresh list"
          >
            <FiRefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${
                (activeTab === 'activity' ? isActivityFetching : isAlertsFetching) ? 'animate-spin' : ''
              }`}
            />
            Refresh
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {/* Primary Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-[#eceae4] pb-2">
          <TabsList className="bg-[#eceae4]/60">
            <TabsTrigger value="activity" className="gap-2 text-xs sm:text-sm">
              <FiBell className="h-4 w-4" />
              Deal Activity
              {unreadActivityCount > 0 && (
                <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#1c1c1c] px-1 text-[10px] font-bold leading-none text-[#fcfbf8]">
                  {unreadActivityCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="overdue" className="gap-2 text-xs sm:text-sm">
              <FiAlertTriangle className="h-4 w-4 " />
              Overdue Deals
              {overdueCount > 0 && (
                <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#1c1c1c] px-1 text-[10px] font-bold leading-none text-[#fcfbf8]">
                  {overdueCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: DEAL ACTIVITY NOTIFICATIONS                           */}
        {/* ============================================================ */}
        <TabsContent value="activity" className="mt-4 space-y-4">
          {/* Sub-header bar: Filters on Left, Mark all as read on Right */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1 rounded-lg border border-[#eceae4] bg-[#fcfbf8] p-1 shadow-2xs">
              {(['all', 'unread', 'read'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setActivityStatusFilter(filter);
                    setActivityPage(1);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    activityStatusFilter === filter
                      ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset'
                      : 'text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c]'
                  }`}
                >
                  {filter === 'all' && `All (${countData?.totalCount ?? 0})`}
                  {filter === 'unread' && `Unread (${countData?.unreadCount ?? 0})`}
                  {filter === 'read' &&
                    `Read (${Math.max(0, (countData?.totalCount ?? 0) - (countData?.unreadCount ?? 0))})`}
                </button>
              ))}
            </div>

            {unreadActivityCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="h-8 text-xs text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-[#eceae4] px-2.5"
              >
                <LuCheckCheck className="h-3.5 w-3.5 mr-1.5 text-[#5f5f5d]" />
                Mark all as read
              </Button>
            )}
          </div>

          {/* Activity Cards Feed */}
          {isActivityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-[#eceae4] bg-white p-4">
                  <div className="flex items-start gap-3.5">
                    <Skeleton className="h-9 w-9 rounded-lg bg-[#eceae4]" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 bg-[#eceae4]" />
                      <Skeleton className="h-4 w-3/4 bg-[#eceae4]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isActivityError ? (
            <ErrorState
              title="Failed to load activity notifications"
              message={activityError?.message || 'Could not fetch activity notifications.'}
              onRetry={() => refetchActivity()}
            />
          ) : !activityNotifications || activityNotifications.length === 0 ? (
            <Card className="border border-[#eceae4] bg-white rounded-xl">
              <CardContent className="p-8">
                <EmptyState
                  icon={
                    activityStatusFilter === 'unread'
                      ? LuCheckCheck
                      : activityStatusFilter === 'read'
                      ? FiClock
                      : FiBell
                  }
                  title="You're all caught up"
                  description={
                    activityStatusFilter === 'unread'
                      ? 'No unread activity right now.'
                      : activityStatusFilter === 'read'
                      ? 'Acknowledged notifications will appear here.'
                      : 'Deal activity from your team will appear here.'
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activityNotifications.map((item: ActivityNotificationItem) => {
                const isUnread = !item.readAt;
                const visual = getNotificationVisual(item.type);
                const Icon = visual.icon;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'group rounded-xl border bg-white p-4 transition-all duration-150 hover:border-[#1c1c1c]/25 hover:shadow-xs',
                      isUnread ? 'border-[#dedcd5] shadow-2xs' : 'border-[#eceae4]'
                    )}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Left Event Icon */}
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors mt-0.5',
                          visual.iconBg,
                          visual.iconBorder,
                          visual.iconColor
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Right Content */}
                      <div className="flex-1 min-w-0">
                        {/* Top row: Event type · Time ... Status */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0 text-[#5f5f5d]">
                            <span className="font-medium text-[#1c1c1c] truncate">
                              {visual.label}
                            </span>
                            <span className="text-[#8c8b87]">·</span>
                            <span className="text-[#8c8b87] shrink-0 flex items-center gap-1">
                              <FiClock className="h-3 w-3" />
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </div>

                          <div className="shrink-0">
                            {isUnread ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                Unread
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-[#8c8b87]">
                                <LuCheckCheck className="h-3.5 w-3.5 text-[#8c8b87]" />
                                Read
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle: Human-readable message with quote block for completion notes */}
                        {item.message?.includes('\n') ? (
                          <div className="mt-1.5 space-y-1.5">
                            <p
                              className={cn(
                                'text-sm leading-relaxed',
                                isUnread ? 'font-semibold text-[#1c1c1c]' : 'font-normal text-[#4a4946]'
                              )}
                            >
                              {item.message.split('\n')[0]}
                            </p>
                            <div className="rounded-lg bg-[#f7f4ed] border-l-2 border-[#1c1c1c]/30 px-3 py-2 text-xs text-[#2c2c2b] italic">
                              {item.message.split('\n').slice(1).join('\n')}
                            </div>
                          </div>
                        ) : (
                          <p
                            className={cn(
                              'text-sm mt-1.5 leading-relaxed',
                              isUnread ? 'font-semibold text-[#1c1c1c]' : 'font-normal text-[#4a4946]'
                            )}
                          >
                            {item.message}
                          </p>
                        )}

                        {/* Bottom contextual actions */}
                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#f2efe8]/80">
                          {item.dealId ? (
                            <Link
                              to={`/deals/${item.dealId}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#1c1c1c] hover:underline group/link"
                            >
                              <span>View deal</span>
                              <FiArrowRight className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5" />
                            </Link>
                          ) : (
                            <span />
                          )}

                          {isUnread && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markReadMutation.mutate(item.id)}
                              disabled={markReadMutation.isPending && markReadMutation.variables === item.id}
                              className="h-7 px-2.5 text-xs font-medium text-[#5f5f5d] hover:text-[#1c1c1c] hover:bg-[#eceae4] rounded-md transition-colors"
                            >
                              <FiCheck className="h-3 w-3 mr-1" />
                              Mark read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Activity Notifications Pagination Footer */}
          {activityPagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#eceae4] pt-3 text-xs text-[#5f5f5d]">
              <span>
                Showing {(activityPagination.page - 1) * activityPagination.limit + 1}–
                {Math.min(activityPagination.page * activityPagination.limit, activityPagination.total)} of{' '}
                {activityPagination.total} notifications
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={activityPagination.page <= 1}
                  onClick={() => setActivityPage((prev) => Math.max(1, prev - 1))}
                  className="h-7 text-xs px-2.5 bg-white border-[#eceae4]"
                >
                  <FiChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <span className="px-2 text-xs font-medium text-[#1c1c1c]">
                  Page {activityPagination.page} of {activityPagination.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={activityPagination.page >= activityPagination.totalPages}
                  onClick={() => setActivityPage((prev) => prev + 1)}
                  className="h-7 text-xs px-2.5 bg-white border-[#eceae4]"
                >
                  Next
                  <FiChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 2: OVERDUE DEAL ALERTS (GOAL 10 PRESERVED)               */}
        {/* ============================================================ */}
        <TabsContent value="overdue" className="mt-4 space-y-4">
          {/* Sub-status filter bar for Overdue Alerts */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 rounded-lg border border-[#eceae4] bg-[#fcfbf8] p-1 shadow-2xs">
              {(['all', 'active', 'dismissed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setAlertStatusFilter(filter)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    alertStatusFilter === filter
                      ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset'
                      : 'text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c]'
                  }`}
                >
                  {filter === 'all' && `All (${alertsCountData?.totalCount ?? alerts?.length ?? 0})`}
                  {filter === 'active' &&
                    `Active (${
                      alertsCountData?.count ??
                      (alertStatusFilter === 'active' ? alerts?.length : 0) ??
                      0
                    })`}
                  {filter === 'dismissed' &&
                    `Dismissed (${
                      alertsCountData?.dismissedCount ??
                      (alertStatusFilter === 'dismissed' ? alerts?.length : 0) ??
                      0
                    })`}
                </button>
              ))}
            </div>

            <span className="text-xs text-[#8c8b87] hidden sm:inline-block">
              Filtered by active closing commitments
            </span>
          </div>

          {/* Overdue Deals Feed */}
          {isAlertsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-[#eceae4] bg-white p-4">
                  <div className="flex items-start gap-3.5">
                    <Skeleton className="h-9 w-9 rounded-lg bg-[#eceae4]" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 bg-[#eceae4]" />
                      <Skeleton className="h-4 w-3/4 bg-[#eceae4]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isAlertsError ? (
            <ErrorState
              title="Failed to load overdue alerts"
              message={alertsError?.message || 'Could not fetch overdue alerts from the database.'}
              onRetry={() => refetchAlerts()}
            />
          ) : !alerts || alerts.length === 0 ? (
            <Card className="border border-[#eceae4] bg-white rounded-xl">
              <CardContent className="p-8">
                <EmptyState
                  icon={alertStatusFilter === 'dismissed' ? LuCheckCheck : FiCheckCircle}
                  title={alertStatusFilter === 'dismissed' ? 'No dismissed alerts' : 'No overdue deals'}
                  description={
                    alertStatusFilter === 'dismissed'
                      ? 'There are no dismissed overdue deal alerts at this time.'
                      : 'Everything is on track.'
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const daysOverdue = getDaysOverdue(alert.expectedCloseDate);
                const ownerInitials = alert.owner?.name
                  ? alert.owner.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : '—';

                return (
                  <div
                    key={alert.id || alert.dealId}
                    className="rounded-xl border border-[#dedcd5] bg-white p-4 transition-all duration-150 hover:border-[#1c1c1c]/25 hover:shadow-xs"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {alert.isDismissed ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium bg-[#eceae4] text-[#5f5f5d] border border-[#dedcd5]">
                              <LuCheckCheck className="h-3 w-3 text-[#5f5f5d]" />
                              Dismissed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium bg-rose-50 text-rose-900 border border-rose-200/80">
                              <FiAlertTriangle className="h-3 w-3 text-rose-700" />
                              {daysOverdue > 0 ? `${daysOverdue} days overdue` : 'Overdue today'}
                            </span>
                          )}
                          <span className="text-[0.6875rem] px-2 py-0.5 rounded-full bg-[#eceae4] text-[#1c1c1c] font-normal">
                            Stage: {alert.stage}
                          </span>
                        </div>

                        <h3 className="text-base font-semibold text-[#1c1c1c] pt-0.5">
                          <Link to={`/deals/${alert.dealId}`} className="hover:underline">
                            {alert.title}
                          </Link>
                        </h3>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#5f5f5d]">
                          {alert.company ? (
                            <Link
                              to={`/companies/${alert.company.id}`}
                              className="flex items-center gap-1 hover:underline text-[#1c1c1c]"
                            >
                              <FiGlobe className="h-3.5 w-3.5 text-[#5f5f5d]" />
                              {alert.company.name}
                            </Link>
                          ) : null}
                          <span>•</span>
                          <span className="font-semibold text-[#1c1c1c]">
                            {formatCurrency(Number(alert.value))}
                          </span>
                        </div>
                      </div>

                      {/* Right: Dismiss Action */}
                      <div className="pt-1 sm:pt-0 shrink-0">
                        {alert.isDismissed ? (
                          <span className="text-xs text-[#8c8b87] italic">
                            Dismissed until close date revised
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDismiss(alert.dealId)}
                            disabled={dismissMutation.isPending && dismissMutation.variables === alert.dealId}
                            className="border-[#eceae4] text-xs font-normal text-[#1c1c1c] hover:bg-[#eceae4] h-8"
                          >
                            {dismissMutation.isPending && dismissMutation.variables === alert.dealId ? (
                              <>
                                <FiRefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Dismissing...
                              </>
                            ) : (
                              'Dismiss Alert'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Footer Row */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f2efe8] pt-2.5 text-xs text-[#5f5f5d]">
                      <div className="flex items-center gap-1.5">
                        <FiCalendar className="h-3.5 w-3.5 text-[#8c8b87]" />
                        <span>Expected close: {formatDate(alert.expectedCloseDate)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {alert.owner && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#8c8b87]">Owner:</span>
                            <div className="flex items-center gap-1.5 text-[#1c1c1c] font-medium">
                              <Avatar
                                fallback={ownerInitials}
                                className="h-6 w-6 text-[10px] font-medium text-[#1c1c1c] bg-[#eceae4] border border-[#dedcd5]"
                              />
                              <span>{alert.owner.name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
