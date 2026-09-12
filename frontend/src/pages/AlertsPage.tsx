import { Link } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiGlobe,
  FiCalendar,
  FiCheckCircle,
  FiRefreshCw,
  FiXCircle,
} from 'react-icons/fi';
import { useAlerts, useDismissAlert } from '@/features/alerts/useAlerts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { formatCurrency, formatDate, getDaysOverdue } from '@/lib/utils';

export function AlertsPage() {
  const { data: alerts, isLoading, isError, error, refetch, isFetching } = useAlerts();
  const dismissMutation = useDismissAlert();

  const handleDismiss = (dealId: string) => {
    dismissMutation.mutate(dealId);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1c1c1c] sm:text-3xl">
              Alerts & Notifications
            </h1>
            {alerts && (
              <Badge
                variant={alerts.length > 0 ? 'default' : 'secondary'}
                className={`text-xs font-normal px-2.5 py-0.5 ${
                  alerts.length > 0
                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset'
                    : 'bg-[#eceae4] text-[#5f5f5d]'
                }`}
              >
                {alerts.length} Active Overdue
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#5f5f5d] mt-1.5 leading-relaxed">
            Real-time notifications for deals that have passed their expected close date without being closed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-[#eceae4] text-[#1c1c1c] hover:bg-[#eceae4]"
            aria-label="Refresh alerts"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Dismissal Success/Pending Banner */}
      {dismissMutation.isSuccess && (
        <div className="flex items-center gap-2.5 rounded-[8px] border border-[#eceae4] bg-[#fcfbf8] p-3 text-xs text-[#1c1c1c] shadow-xs">
          <FiCheckCircle className="h-4 w-4 text-[#1c1c1c] shrink-0" />
          <span>Alert dismissed successfully. It will remain suppressed until the deal close date is revised.</span>
        </div>
      )}

      {dismissMutation.isError && (
        <div className="flex items-center gap-2.5 rounded-[8px] border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive shadow-xs">
          <FiXCircle className="h-4 w-4 shrink-0" />
          <span>{dismissMutation.error?.message || 'Failed to dismiss alert. Please try again.'}</span>
        </div>
      )}

      {/* Overdue Deals Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl p-5">
              <div className="space-y-3">
                <Skeleton className="h-5 w-48 bg-[#eceae4]" />
                <Skeleton className="h-4 w-72 bg-[#eceae4]" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-7 w-20 bg-[#eceae4]" />
                  <Skeleton className="h-7 w-24 bg-[#eceae4]" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load overdue alerts"
          message={error?.message || 'Could not fetch overdue alerts from the database.'}
          onRetry={() => refetch()}
        />
      ) : !alerts || alerts.length === 0 ? (
        <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl">
          <CardContent className="p-8">
            <EmptyState
              icon={FiCheckCircle}
              title="All Caught Up"
              description="There are no active overdue deal alerts at this time. All pipeline deals are currently on schedule."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
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
              <Card
                key={alert.id || alert.dealId}
                className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl shadow-xs transition-all hover:border-[rgba(28,28,28,0.4)] hover:shadow-sm"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="bg-[#1c1c1c] text-[#fcfbf8] border-[#1c1c1c] text-[0.6875rem] font-medium px-2 py-0.5 gap-1"
                        >
                          <FiAlertTriangle className="h-3 w-3" />
                          {daysOverdue > 0 ? `${daysOverdue} Days Overdue` : 'Overdue Today'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-[#eceae4] text-[#1c1c1c] font-normal">
                          Stage: {alert.stage}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-semibold text-[#1c1c1c] pt-1">
                        <Link to={`/deals/${alert.dealId}`} className="hover:underline">
                          {alert.title}
                        </Link>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-xs text-[#5f5f5d]">
                        {alert.company ? (
                          <Link
                            to={`/companies/${alert.company.id}`}
                            className="flex items-center gap-1 hover:underline text-[#1c1c1c]"
                          >
                            <FiGlobe className="h-3.5 w-3.5" />
                            {alert.company.name}
                          </Link>
                        ) : null}
                        <span>•</span>
                        <span className="font-semibold text-[#1c1c1c]">
                          {formatCurrency(Number(alert.value))}
                        </span>
                      </CardDescription>
                    </div>

                    {/* Action button */}
                    <div className="pt-2 sm:pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDismiss(alert.dealId)}
                        disabled={dismissMutation.isPending && dismissMutation.variables === alert.dealId}
                        className="border-[#eceae4] text-xs font-normal text-[#1c1c1c] hover:bg-[#eceae4]"
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
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceae4]/70 pt-3 text-xs text-[#5f5f5d]">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="h-3.5 w-3.5 text-[#5f5f5d]" />
                      <span>
                        Expected Close Date:{' '}
                        <strong className="text-[#1c1c1c] font-medium">
                          {formatDate(alert.expectedCloseDate)}
                        </strong>
                      </span>
                    </div>

                    {alert.owner && (
                      <div className="flex items-center gap-2">
                        <Avatar
                          fallback={ownerInitials}
                          className="h-5 w-5 text-[0.5625rem] font-medium text-[#1c1c1c] bg-[#eceae4] border border-[#eceae4]"
                        />
                        <span>
                          Owner:{' '}
                          <strong className="text-[#1c1c1c] font-medium">{alert.owner.name}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
