import { useState } from 'react';
import {
  FiTrash2,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiGlobe,
  FiInfo,
  FiClock,
} from 'react-icons/fi';
import { useDealsTrash } from '@/features/deals/useDeals';
import { DealStage, STAGE_LABELS } from '@/features/deals/deals.types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export function TrashPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, error, refetch } = useDealsTrash({
    search: debouncedSearch || undefined,
    page,
    pageSize,
  });

  const deals = data?.deals || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4 animate-in fade-in duration-200 w-full">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1c1c1c] flex items-center gap-2.5">
          <FiTrash2 className="h-6 w-6 text-[#1c1c1c]" />
          Trash Archive
        </h1>
        <p className="text-xs text-[#5f5f5d] mt-1">
          Historical archive of soft-deleted opportunities. Records are preserved for audit integrity and excluded from pipeline reports.
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-3 rounded-[10px] border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-950">
        <FiInfo className="h-4 w-4 shrink-0 text-amber-700" />
        <span>
          <strong>Read-Only Archive:</strong> Soft-deleted deals cannot be modified directly. They are maintained with full historical audit trails in accordance with CRM data retention policies.
        </span>
      </div>

      {/* Filter Bar */}
      <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs rounded-xl">
        <CardContent className="p-4">
          <div className="relative w-full max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8e8d8a]" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search soft-deleted deals by title..."
              className="pl-9 h-9 text-xs bg-white border-[#eceae4] focus-visible:border-[rgba(28,28,28,0.4)] focus-visible:ring-0 focus:ring-0 focus:outline-none focus-visible:outline-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Deals Table */}
      <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl overflow-hidden shadow-2xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={4} columns={5} />
            </div>
          ) : isError ? (
            <div className="p-6">
              <EmptyState
                title="Failed to load trash"
                description={error?.message || 'An error occurred while loading the trash archive.'}
                actionLabel="Try Again"
                onAction={() => refetch()}
              />
            </div>
          ) : deals.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Trash is empty"
                description={search ? 'No deleted deals match your search query.' : 'There are currently no soft-deleted deals in the archive.'}
              />
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[220px]">
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
                      Stage When Deleted
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Deleted At
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Original Owner
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => {
                    const stageStyle = STAGE_BADGE_STYLES[deal.stage] || STAGE_BADGE_STYLES.NEW;
                    return (
                      <TableRow
                        key={deal.id}
                        className="border-b border-[#eceae4] bg-stone-50/30"
                      >
                        <TableCell className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-[#1c1c1c]">
                              {deal.title}
                            </span>
                            {deal.company && (
                              <div className="flex items-center gap-1 text-xs text-[#5f5f5d] mt-0.5">
                                <FiGlobe className="h-3 w-3" />
                                <span>{deal.company.name}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-semibold text-sm text-[#1c1c1c]">
                          {formatCurrency(Number(deal.value))}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-medium px-2 py-0.5 border opacity-80 ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border}`}
                          >
                            {STAGE_LABELS[deal.stage]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs text-[#5f5f5d]">
                          <div className="flex items-center gap-1.5">
                            <FiClock className="h-3.5 w-3.5 text-[#8e8d8a]" />
                            <span>{deal.deletedAt ? formatDate(deal.deletedAt) : 'Deleted'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs text-[#1c1c1c]">
                          {deal.owner?.name || '—'}
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
                Showing {deals.length} of {pagination.total} archived items
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
