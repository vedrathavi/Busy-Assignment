import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiTrendingUp,
  FiDollarSign,
  FiAward,
  FiXCircle,
  FiArrowUpRight,
  FiBell,
  FiGlobe,
  FiUsers,
  FiBriefcase,
} from 'react-icons/fi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '@/features/auth/AuthContext';
import { useDashboardMetrics } from '@/features/dashboard/useDashboard';
import { useAlertsCount } from '@/features/alerts/useAlerts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { MetricCardSkeleton } from '@/components/common/SkeletonLoader';
import { ErrorState } from '@/components/common/ErrorState';
import { formatCurrency } from '@/lib/utils';
import { DealStage } from '@/features/dashboard/dashboard.types';

import {
  PageHeader,
  PageHeaderHeading,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from '@/components/ui/page-header';

const STAGE_CONFIG: Record<DealStage, { label: string; color: string; bg: string }> = {
  NEW: { label: 'New', color: '#1c1c1c', bg: 'bg-[#eceae4]' },
  QUALIFIED: { label: 'Qualified', color: '#1c1c1c', bg: 'bg-[#eceae4]' },
  PROPOSAL: { label: 'Proposal', color: '#1c1c1c', bg: 'bg-[#eceae4]' },
  NEGOTIATION: { label: 'Negotiation', color: '#1c1c1c', bg: 'bg-[#eceae4]' },
  WON: { label: 'Won', color: '#1c1c1c', bg: 'bg-[#eceae4]' },
  LOST: { label: 'Lost', color: '#5f5f5d', bg: 'bg-[#eceae4]' },
};

export function DashboardPage() {
  const { user, isManager } = useAuth();
  const { data: metrics, isLoading, isError, error, refetch } = useDashboardMetrics();
  const { data: alertsCount } = useAlertsCount();

  // Format weekly chart data
  const chartData = useMemo(() => {
    if (!metrics?.wonPerWeek) return [];
    return metrics.wonPerWeek.map((item, idx) => {
      const start = new Date(item.weekStart);
      const label = `${start.getMonth() + 1}/${start.getDate()}`;
      return {
        name: label,
        fullName: `Week of ${item.weekStart}`,
        won: item.count,
        index: idx + 1,
      };
    });
  }, [metrics?.wonPerWeek]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1c1c1c] sm:text-3xl">
              Sales Dashboard
            </h1>
            <p className="text-sm text-[#5f5f5d] mt-1">Loading real-time pipeline metrics...</p>
          </div>
        </div>
        <MetricCardSkeleton count={4} />
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <ErrorState
        title="Failed to load dashboard metrics"
        message={error?.message || 'Unable to retrieve data from database. Please try again.'}
        onRetry={() => refetch()}
      />
    );
  }

  const totalOpenCount = metrics.openDeals || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader>
        <PageHeaderHeading>
          <div className="flex items-center gap-2.5">
            <PageHeaderTitle>Sales Dashboard</PageHeaderTitle>
            <Badge variant="outline" className="text-xs font-normal text-[#5f5f5d] border-[#eceae4]">
              {isManager ? 'Team View' : 'Personal View'}
            </Badge>
          </div>
          <PageHeaderDescription>
            Welcome back, <span className="font-medium text-[#1c1c1c]">{user?.name}</span>. Here is your pipeline summary.
          </PageHeaderDescription>
        </PageHeaderHeading>

        {/* Quick Actions */}
        <PageHeaderActions>
          {alertsCount && alertsCount.count > 0 ? (
            <Link to="/alerts">
              <Button variant="outline" size="sm" className="gap-2 border-[#eceae4] text-[#1c1c1c] hover:bg-[#eceae4]">
                <FiBell className="h-3.5 w-3.5" />
                <span>{alertsCount.count} Overdue Alert{alertsCount.count > 1 ? 's' : ''}</span>
              </Button>
            </Link>
          ) : null}
          <Link to="/deals">
            <Button size="sm" className="gap-1.5 bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset hover:opacity-90">
              <FiBriefcase className="h-3.5 w-3.5" />
              <span>View All Deals</span>
            </Button>
          </Link>
        </PageHeaderActions>
      </PageHeader>

      {/* 4 Interactive Executive Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Open Deals */}
        <Link to="/deals" className="group block">
          <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl shadow-2xs transition-all duration-150 hover:border-[rgba(28,28,28,0.4)] hover:shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-[#5f5f5d] group-hover:text-[#1c1c1c]">
                Open Deals
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#eceae4] text-[#1c1c1c] group-hover:bg-[#1c1c1c] group-hover:text-[#fcfbf8] transition-colors">
                <FiTrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">
                {metrics.openDeals}
              </div>
              <p className="text-xs text-[#5f5f5d] mt-1 flex items-center justify-between">
                <span>Active pipeline</span>
                <FiArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Metric 2: Weighted Pipeline */}
        <Link to="/deals" className="group block">
          <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl shadow-2xs transition-all duration-150 hover:border-[rgba(28,28,28,0.4)] hover:shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-[#5f5f5d] group-hover:text-[#1c1c1c]">
                Weighted Pipeline
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#eceae4] text-[#1c1c1c] group-hover:bg-[#1c1c1c] group-hover:text-[#fcfbf8] transition-colors">
                <FiDollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">
                {formatCurrency(Number(metrics.weightedPipeline))}
              </div>
              <p className="text-xs text-[#5f5f5d] mt-1 flex items-center justify-between">
                <span>Forecasted value</span>
                <FiArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Metric 3: Won This Month */}
        <Link to="/deals?stage=WON" className="group block">
          <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl shadow-2xs transition-all duration-150 hover:border-emerald-600 hover:shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-[#5f5f5d] group-hover:text-emerald-700">
                Won This Month
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-emerald-100 text-emerald-800 transition-colors">
                <FiAward className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">
                {metrics.wonThisMonth}
              </div>
              <p className="text-xs text-[#5f5f5d] mt-1 flex items-center justify-between">
                <span>Closed-won deals</span>
                <FiArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Metric 4: Lost This Month */}
        <Link to="/deals?stage=LOST" className="group block">
          <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl shadow-2xs transition-all duration-150 hover:border-rose-600 hover:shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-[#5f5f5d] group-hover:text-rose-700">
                Lost This Month
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-rose-100 text-rose-800 transition-colors">
                <FiXCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight text-[#1c1c1c]">
                {metrics.lostThisMonth}
              </div>
              <p className="text-xs text-[#5f5f5d] mt-1 flex items-center justify-between">
                <span>Closed-lost deals</span>
                <FiArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Analytics Charts & Pipeline Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
        {/* Left Column (4 cols): 8-Week Win Trend Chart */}
        <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl lg:col-span-4 shadow-2xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-[#1c1c1c]">
                  8-Week Win Trend
                </CardTitle>
                <CardDescription className="text-xs text-[#5f5f5d] mt-0.5">
                  Number of deals successfully won week-by-week
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[0.6875rem] font-normal text-[#5f5f5d] border-[#eceae4]">
                Trailing 8 Weeks
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceae4" />
                  <XAxis
                    dataKey="name"
                    stroke="#5f5f5d"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#eceae4' }}
                  />
                  <YAxis
                    stroke="#5f5f5d"
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: '#eceae4' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(28,28,28,0.03)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-[6px] border border-[#eceae4] bg-[#fcfbf8] px-3 py-2 text-xs shadow-focus-soft">
                            <p className="font-medium text-[#1c1c1c]">{d.fullName}</p>
                            <p className="text-[#5f5f5d] mt-1">
                              Won Deals: <span className="font-semibold text-[#1c1c1c]">{d.won}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="won"
                    fill="#1c1c1c"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right Column (3 cols): Clickable Stage Distribution */}
        <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl lg:col-span-3 shadow-2xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-[#1c1c1c]">
                  Stage Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-[#5f5f5d] mt-0.5">
                  Click any stage to filter pipeline
                </CardDescription>
              </div>
              <Link to="/deals">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-[#5f5f5d] hover:text-[#1c1c1c] gap-1 p-0 px-2">
                  View <FiArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5">
            {metrics.openDealsByStage && metrics.openDealsByStage.length > 0 ? (
              metrics.openDealsByStage.map((item) => {
                const conf = STAGE_CONFIG[item.stage] || { label: item.stage, bg: 'bg-[#eceae4]' };
                const pct = totalOpenCount > 0 ? Math.round((item.count / totalOpenCount) * 100) : 0;
                return (
                  <Link
                    key={item.stage}
                    to={`/deals?stage=${item.stage}`}
                    className="group block space-y-1.5 rounded-[6px] p-1.5 -mx-1.5 hover:bg-[rgba(28,28,28,0.03)] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#1c1c1c] group-hover:underline">{conf.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1c1c1c]">{item.count} deals</span>
                        <span className="text-[#5f5f5d] text-[0.6875rem]">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#eceae4]">
                      <div
                        className="h-full bg-[#1c1c1c] transition-all duration-300 group-hover:bg-[#3b82f6]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="text-xs text-[#5f5f5d] py-6 text-center">No open deals in pipeline.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manager View: Rep / Owner Deal Distribution (Clickable) */}
      {isManager && metrics.openDealsByOwner && metrics.openDealsByOwner.length > 0 && (
        <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#eceae4] text-[#1c1c1c]">
                  <FiUsers className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-[#1c1c1c]">
                    Team Performance & Deal Allocation
                  </CardTitle>
                  <CardDescription className="text-xs text-[#5f5f5d] mt-0.5">
                    Click any team member to view their deals
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-normal border-[#eceae4] text-[#5f5f5d]">
                {metrics.openDealsByOwner.length} Reps
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {metrics.openDealsByOwner.map((rep) => {
                const initials = rep.ownerName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                return (
                  <Link
                    key={rep.ownerId}
                    to={`/deals?ownerId=${rep.ownerId}`}
                    className="flex items-center justify-between rounded-[8px] border border-[#eceae4] bg-[#f7f4ed] p-3 transition-all hover:border-[rgba(28,28,28,0.4)] hover:shadow-xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        fallback={initials}
                        className="h-8 w-8 text-xs font-medium text-[#1c1c1c] bg-[#eceae4] border border-[#eceae4]"
                      />
                      <div className="truncate">
                        <p className="text-xs font-medium text-[#1c1c1c] truncate group-hover:underline">
                          {rep.ownerName}
                        </p>
                        <p className="text-[0.6875rem] text-[#5f5f5d]">Sales Representative</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-semibold text-xs bg-[#eceae4] text-[#1c1c1c]">
                      {rep.count} Deals
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to="/companies" className="group block">
          <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl p-4 transition-all duration-200 hover:border-[rgba(28,28,28,0.4)] hover:shadow-xs shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#eceae4] text-[#1c1c1c]">
                  <FiGlobe className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#1c1c1c] group-hover:underline">
                    Company Directory
                  </h2>
                  <p className="text-xs text-[#5f5f5d] mt-0.5">
                    Browse and manage client accounts & organizations
                  </p>
                </div>
              </div>
              <FiArrowUpRight className="h-4 w-4 text-[#5f5f5d] group-hover:text-[#1c1c1c]" />
            </div>
          </Card>
        </Link>

        <Link to="/deals" className="group block">
          <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl p-4 transition-all duration-200 hover:border-[rgba(28,28,28,0.4)] hover:shadow-xs shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#eceae4] text-[#1c1c1c]">
                  <FiDollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#1c1c1c] group-hover:underline">
                    Deal Pipeline & Opportunities
                  </h2>
                  <p className="text-xs text-[#5f5f5d] mt-0.5">
                    Filter by stage, inspect values, and track expected close dates
                  </p>
                </div>
              </div>
              <FiArrowUpRight className="h-4 w-4 text-[#5f5f5d] group-hover:text-[#1c1c1c]" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
