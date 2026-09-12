import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiMail,
  FiCalendar,
  FiShield,
  FiBriefcase,
  FiTrendingUp,
  FiCheckCircle,
  FiLayers,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiGlobe,
} from 'react-icons/fi';
import { useUserProfile } from '@/features/users/useUsers';
import { useDeals } from '@/features/deals/useDeals';
import { DealStage, STAGE_LABELS, STAGE_ORDER } from '@/features/deals/deals.types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

const STAGE_BADGE_STYLES: Record<DealStage, { bg: string; text: string; border: string }> = {
  NEW: { bg: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-200' },
  QUALIFIED: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  PROPOSAL: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  NEGOTIATION: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  WON: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  LOST: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
};

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Query state for user's scoped deals
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedStage, setSelectedStage] = useState<DealStage | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Server-side user profile & stats query
  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
  } = useUserProfile(id);

  // Server-side scoped deals query (NEVER fetches whole dataset to filter client-side)
  const {
    data: dealsData,
    isLoading: isDealsLoading,
    isError: isDealsError,
  } = useDeals({
    ownerId: id,
    search: debouncedSearch || undefined,
    stage: selectedStage === 'ALL' ? undefined : selectedStage,
    page,
    pageSize,
  });

  const user = profileData?.user;
  const stats = profileData?.stats;
  const deals = dealsData?.deals || [];
  const pagination = dealsData?.pagination;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (isProfileLoading) {
    return (
      <div className="space-y-6 w-full">
        <TableSkeleton rows={4} columns={4} />
      </div>
    );
  }

  if (isProfileError || !user) {
    return (
      <EmptyState
        title="User not found"
        description={profileError?.message || 'This team member does not exist or you are not authorized to view this profile.'}
        actionLabel="Back to Team"
        onAction={() => navigate('/users')}
      />
    );
  }

  const isManager = user.role === 'MANAGER';

  return (
    <div className="space-y-6 w-full flex-1 flex flex-col">
      {/* Top Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5f5f5d]">
        <button
          type="button"
          onClick={() => navigate('/users')}
          title="Back to Team"
          aria-label="Back to Team"
          className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#eceae4] bg-[#fcfbf8] text-[#5f5f5d] shadow-2xs transition-colors hover:bg-[#eceae4] hover:text-[#1c1c1c] cursor-pointer"
        >
          <FiArrowLeft className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-1 rounded-[6px] border border-[#eceae4] bg-[#fcfbf8] px-1.5 py-1 shadow-2xs">
          <Link
            to="/users"
            className="rounded-[4px] px-2 py-0.5 font-medium text-[#5f5f5d] transition-colors hover:bg-[#eceae4] hover:text-[#1c1c1c]"
          >
            Team
          </Link>

          <FiChevronRight className="h-3 w-3 text-[#5f5f5d]/50 shrink-0" />

          <span className="rounded-[4px] bg-[#eceae4] px-2 py-0.5 font-semibold text-[#1c1c1c] truncate max-w-[240px]">
            {user.name}
          </span>
        </div>
      </nav>

      {/* Profile Header Card */}
      <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#1c1c1c] text-xl font-bold text-white shadow-xs">
                {getInitials(user.name)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-[#1c1c1c]">{user.name}</h1>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] uppercase tracking-wider font-semibold ${
                      isManager
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isManager ? (
                      <span className="flex items-center gap-1">
                        <FiShield className="h-2.5 w-2.5" /> Manager
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <FiBriefcase className="h-2.5 w-2.5" /> Sales Rep
                      </span>
                    )}
                  </Badge>
                </div>
                <p className="text-xs text-[#5f5f5d] flex items-center gap-1.5">
                  <FiMail className="h-3.5 w-3.5" />
                  <span>{user.email}</span>
                </p>
                <p className="text-[11px] text-[#8e8d8a] flex items-center gap-1.5">
                  <FiCalendar className="h-3.5 w-3.5" />
                  <span>Member since {formatDate(user.createdAt)}</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-blue-50 text-blue-700">
                <FiBriefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5f5f5d]">Active Open Deals</p>
                <p className="text-xl font-bold text-[#1c1c1c]">{stats.openDeals}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-amber-50 text-amber-700">
                <FiTrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5f5f5d]">Active Pipeline Value</p>
                <p className="text-xl font-bold text-[#1c1c1c]">
                  {formatCurrency(Number(stats.pipelineValue))}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700">
                <FiCheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5f5f5d]">Closed Won Deals</p>
                <p className="text-xl font-bold text-[#1c1c1c]">{stats.wonDeals}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-stone-100 text-stone-700">
                <FiLayers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#5f5f5d]">Lifetime Total Deals</p>
                <p className="text-xl font-bold text-[#1c1c1c]">{stats.totalDeals}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scoped Deals Section */}
      <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-xs">
        <CardHeader className="p-4 border-b border-[#eceae4] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-[#1c1c1c]">
              Opportunities Owned by {user.name.split(' ')[0]}
            </CardTitle>
            <p className="text-xs text-[#5f5f5d] mt-0.5">
              Server-scoped deal pipeline for this representative.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8e8d8a]" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search deals..."
                className="pl-8 h-8 text-xs w-44 bg-white border-[#eceae4]"
              />
            </div>
            <Select
              value={selectedStage}
              onChange={(e) => {
                setSelectedStage(e.target.value as any);
                setPage(1);
              }}
              className="h-8 text-xs w-36 bg-white border-[#eceae4]"
            >
              <option value="ALL">All Stages</option>
              {STAGE_ORDER.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isDealsLoading ? (
            <TableSkeleton rows={4} columns={5} />
          ) : isDealsError ? (
            <div className="p-8 text-center text-xs text-[#8e8d8a]">
              Failed to load opportunities for this user.
            </div>
          ) : deals.length === 0 ? (
            <div className="p-8 text-center">
              <FiBriefcase className="mx-auto h-8 w-8 text-[#5f5f5d]/40" />
              <p className="mt-2 text-sm font-medium text-[#1c1c1c]">No deals found</p>
              <p className="text-xs text-[#5f5f5d] mt-0.5">
                {search || selectedStage !== 'ALL'
                  ? 'No opportunities match the selected filters.'
                  : `${user.name} currently does not own any visible opportunities.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#eceae4] bg-[#f7f4ed]/50">
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Title & Company
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4 text-right">
                      Value
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4 text-center">
                      Stage
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Expected Close
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Collaborators
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => {
                    const stageStyle = STAGE_BADGE_STYLES[deal.stage] || STAGE_BADGE_STYLES.NEW;
                    return (
                      <TableRow
                        key={deal.id}
                        onClick={() => navigate(`/deals/${deal.id}`)}
                        className="border-b border-[#eceae4] cursor-pointer hover:bg-[#f7f4ed]/70 transition-colors"
                      >
                        <TableCell className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-[#1c1c1c] hover:underline">
                              {deal.title}
                            </span>
                            {deal.company && (
                              <Link
                                to={`/companies/${deal.company.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-xs text-[#5f5f5d] mt-0.5 hover:text-[#1c1c1c]"
                              >
                                <FiGlobe className="h-3 w-3" />
                                <span>{deal.company.name}</span>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-semibold text-sm text-[#1c1c1c]">
                          {formatCurrency(Number(deal.value))}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-medium px-2 py-0.5 border ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border}`}
                          >
                            {STAGE_LABELS[deal.stage]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs text-[#1c1c1c]">
                          {formatDate(deal.expectedCloseDate)}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          {deal.collaborators && deal.collaborators.length > 0 ? (
                            <div
                              className="flex items-center -space-x-1.5 overflow-hidden"
                              title={`Collaborators: ${deal.collaborators
                                .map((c) => c.user?.name || 'Unknown')
                                .join(', ')}`}
                            >
                              {deal.collaborators.slice(0, 2).map((c) => (
                                <Avatar
                                  key={c.userId}
                                  fallback={
                                    c.user?.name
                                      ? c.user.name
                                          .split(' ')
                                          .map((n) => n[0])
                                          .slice(0, 2)
                                          .join('')
                                          .toUpperCase()
                                      : '??'
                                  }
                                  className="h-6 w-6 text-[9px] font-semibold text-[#1c1c1c] bg-[#eceae4] border-2 border-[#fcfbf8]"
                                />
                              ))}
                              {deal.collaborators.length > 2 && (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f4f2eb] border-2 border-[#fcfbf8] text-[9px] font-bold text-[#5f5f5d]">
                                  +{deal.collaborators.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#8e8d8a]">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-[#eceae4]">
              <span className="text-xs text-[#5f5f5d]">
                Showing {deals.length} of {pagination.total} opportunities
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs gap-1"
                >
                  <FiChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <span className="text-xs font-medium text-[#1c1c1c]">
                  Page {page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs gap-1"
                >
                  Next <FiChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
