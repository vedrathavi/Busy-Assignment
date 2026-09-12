import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FiDollarSign,
  FiSearch,
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
  FiAlertTriangle,
  FiRefreshCw,
  FiGlobe,
  FiPlus,
  FiArrowRight,
  FiUserCheck,
  FiX,
  FiSliders,
  FiChevronDown,
  FiCheck,
  FiLoader,
} from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useDeals,
  useCreateDeal,
  useExportDealsCsv,
  useBulkAdvanceDeals,
  useBulkReassignDeals,
} from '@/features/deals/useDeals';
import { useCompanies } from '@/features/companies/useCompanies';
import { useAuth } from '@/features/auth/AuthContext';
import { useUIStore } from '@/store/ui.store';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { UserSelector } from '@/components/common/UserSelector';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DealStage, STAGE_LABELS } from '@/features/deals/deals.types';

const STAGE_FILTERS: { value: DealStage | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Stages' },
  { value: 'NEW', label: 'New' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

const STAGE_BADGE_STYLES: Record<DealStage, { bg: string; text: string; border: string }> = {
  NEW: { bg: 'bg-[#f7f4ed]', text: 'text-[#1c1c1c]', border: 'border-[#eceae4]' },
  QUALIFIED: { bg: 'bg-[#eceae4]', text: 'text-[#1c1c1c]', border: 'border-[#eceae4]' },
  PROPOSAL: { bg: 'bg-[#eceae4]', text: 'text-[#1c1c1c]', border: 'border-[#eceae4]' },
  NEGOTIATION: { bg: 'bg-[#1c1c1c]', text: 'text-[#fcfbf8]', border: 'border-[#1c1c1c]' },
  WON: { bg: 'bg-emerald-700', text: 'text-white', border: 'border-emerald-700' },
  LOST: { bg: 'bg-rose-700', text: 'text-white', border: 'border-rose-700' },
};

const SORT_OPTIONS = [
  { by: 'updatedAt', order: 'desc', label: 'Last Updated (Newest)' },
  { by: 'updatedAt', order: 'asc', label: 'Last Updated (Oldest)' },
  { by: 'value', order: 'desc', label: 'Deal Value (High to Low)' },
  { by: 'value', order: 'asc', label: 'Deal Value (Low to High)' },
  { by: 'expectedCloseDate', order: 'asc', label: 'Close Date (Earliest)' },
  { by: 'expectedCloseDate', order: 'desc', label: 'Close Date (Latest)' },
] as const;

export function DealsPage() {
  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query params
  const urlSearch = searchParams.get('search') || '';
  const urlStage = (searchParams.get('stage') as DealStage | 'ALL') || 'ALL';
  const urlReopened = searchParams.get('isReopened') === 'true';
  const urlOwner = searchParams.get('ownerId') || undefined;
  const urlCompany = searchParams.get('companyId') || undefined;
  const urlSortBy = (searchParams.get('sortBy') as 'value' | 'expectedCloseDate' | 'updatedAt') || 'updatedAt';
  const urlSortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, 250);
  const [selectedStage, setSelectedStage] = useState<DealStage | 'ALL'>(urlStage);
  const [isReopenedOnly, setIsReopenedOnly] = useState(urlReopened);
  const [sortBy, setSortBy] = useState<'value' | 'expectedCloseDate' | 'updatedAt'>(urlSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(urlSortOrder);
  const [page, setPage] = useState(urlPage);
  const pageSize = 10;

  const activeSortOption =
    SORT_OPTIONS.find((opt) => opt.by === sortBy && opt.order === sortOrder) ||
    SORT_OPTIONS[0];

  // Zustand bulk selection
  const { selectedDealIds, toggleDealSelection, selectAllDeals, clearDealSelection } = useUIStore();

  // Sync state with URL params
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    if (selectedStage !== 'ALL') {
      params.set('stage', selectedStage);
    } else {
      params.delete('stage');
    }
    if (isReopenedOnly) {
      params.set('isReopened', 'true');
    } else {
      params.delete('isReopened');
    }
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('page', page.toString());
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, selectedStage, isReopenedOnly, sortBy, sortOrder, page]);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      stage: selectedStage,
      isReopened: isReopenedOnly ? true : undefined,
      ownerId: urlOwner,
      companyId: urlCompany,
      page,
      pageSize,
      sortBy,
      sortOrder,
    }),
    [debouncedSearch, selectedStage, isReopenedOnly, urlOwner, urlCompany, page, sortBy, sortOrder]
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useDeals(queryParams);
  const { data: companiesData } = useCompanies({ isArchived: 'false', limit: 100 });
  const companiesList = companiesData?.companies || [];

  const createDealMutation = useCreateDeal();
  const exportCsvMutation = useExportDealsCsv();
  const bulkAdvanceMutation = useBulkAdvanceDeals();
  const bulkReassignMutation = useBulkReassignDeals();

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkReassignOpen, setIsBulkReassignOpen] = useState(false);
  const [bulkReassignOwnerId, setBulkReassignOwnerId] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Create form state
  const [dealTitle, setDealTitle] = useState('');
  const [dealCompanyId, setDealCompanyId] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [dealCloseDate, setDealCloseDate] = useState('');
  const [dealOwnerId, setDealOwnerId] = useState('');

  const openCreateModal = () => {
    setDealTitle('');
    setDealCompanyId(companiesList[0]?.id || '');
    setDealValue('');
    setDealCloseDate('');
    setDealOwnerId('');
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isManager && !dealOwnerId.trim()) {
      setCreateError('Please select a deal owner.');
      return;
    }
    setCreateError(null);
    try {
      await createDealMutation.mutateAsync({
        title: dealTitle.trim(),
        companyId: dealCompanyId,
        value: dealValue.trim(),
        expectedCloseDate: dealCloseDate,
        ...(isManager && dealOwnerId ? { ownerId: dealOwnerId } : {}),
      });
      setIsCreateOpen(false);
      toast.success('Deal created successfully');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create deal';
      setCreateError(msg);
      toast.error(msg);
    }
  };

  const handleBulkAdvance = async () => {
    if (!isManager || selectedDealIds.length === 0) return;
    setBulkError(null);
    try {
      await bulkAdvanceMutation.mutateAsync(selectedDealIds);
      toast.success(`Successfully advanced ${selectedDealIds.length} deals`);
      clearDealSelection();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Bulk advance failed';
      setBulkError(msg);
      toast.error(msg);
    }
  };

  const handleBulkReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager || selectedDealIds.length === 0 || !bulkReassignOwnerId.trim()) return;
    setBulkError(null);
    try {
      await bulkReassignMutation.mutateAsync({
        dealIds: selectedDealIds,
        ownerId: bulkReassignOwnerId.trim(),
      });
      toast.success(`Successfully reassigned ${selectedDealIds.length} deals`);
      setIsBulkReassignOpen(false);
      clearDealSelection();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Bulk reassignment failed';
      setBulkError(msg);
      toast.error(msg);
    }
  };

  const isDealOverdue = (closeDateStr: string, stage: DealStage) => {
    if (stage === 'WON' || stage === 'LOST') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const closeDate = new Date(closeDateStr);
    closeDate.setHours(0, 0, 0, 0);
    return closeDate < today;
  };

  const deals = data?.deals || [];
  const allSelected = deals.length > 0 && deals.every((d) => selectedDealIds.includes(d.id));

  const handleSelectAll = () => {
    if (allSelected) {
      clearDealSelection();
    } else {
      selectAllDeals(deals.map((d) => d.id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1c1c1c] sm:text-3xl">
              Deals Pipeline
            </h1>
            {data?.pagination && (
              <Badge variant="outline" className="text-xs font-normal text-[#5f5f5d] border-[#eceae4]">
                {data.pagination.total} Total
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#5f5f5d] mt-1.5 leading-relaxed">
            Track active revenue opportunities, probability weights, and stage lifecycles.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-[#eceae4] text-[#1c1c1c] hover:bg-[#eceae4]"
            aria-label="Refresh deals"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsvMutation.mutate()}
            disabled={exportCsvMutation.isPending}
            className="border-[#eceae4] text-[#1c1c1c] hover:bg-[#eceae4]"
          >
            <FiDownload className={`h-3.5 w-3.5 mr-1.5 ${exportCsvMutation.isPending ? 'animate-spin' : ''}`} />
            Export CSV
          </Button>

          <Button
            size="sm"
            onClick={openCreateModal}
            className="bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset gap-1.5"
          >
            <FiPlus className="h-4 w-4" />
            <span>Create Deal</span>
          </Button>
        </div>
      </div>

      {bulkError && (
        <div className="rounded-[8px] border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {bulkError}
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl p-4 shadow-2xs space-y-3">
        {/* Search & Sort Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f5f5d]" />
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Search deals by title..."
              className="pl-9 bg-[#f7f4ed] border-[#eceae4] rounded-[6px] text-xs focus-visible:border-[rgba(28,28,28,0.4)]"
            />
          </div>

          {/* Unified Modern Sort Dropdown Menu */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 bg-[#fcfbf8] border-[#eceae4] text-xs font-medium text-[#1c1c1c] hover:bg-[#eceae4]/60 shadow-xs shrink-0"
                >
                  <FiSliders className="h-3.5 w-3.5 text-[#5f5f5d]" />
                  <span className="whitespace-nowrap">Sort: {activeSortOption.label}</span>
                  <FiChevronDown className="h-3.5 w-3.5 text-[#5f5f5d]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#fcfbf8] border-[#eceae4] rounded-[8px] shadow-focus-soft">
                <DropdownMenuLabel className="text-[0.6875rem] font-medium uppercase tracking-wider text-[#5f5f5d]">
                  Sort deals by
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#eceae4]" />
                {SORT_OPTIONS.map((opt) => {
                  const isActive = sortBy === opt.by && sortOrder === opt.order;
                  return (
                    <DropdownMenuItem
                      key={`${opt.by}-${opt.order}`}
                      onClick={() => {
                        setSortBy(opt.by as any);
                        setSortOrder(opt.order as any);
                      }}
                      className={`flex items-center justify-between text-xs py-2 px-2.5 cursor-pointer rounded-[4px] ${
                        isActive
                          ? 'font-medium text-[#1c1c1c] bg-[#eceae4]'
                          : 'text-[#5f5f5d] hover:bg-[#eceae4]/50 hover:text-[#1c1c1c]'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isActive && <FiCheck className="h-3.5 w-3.5 text-[#1c1c1c]" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stage Filter Pills & Reopened Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#eceae4]/70">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[0.6875rem] font-medium text-[#5f5f5d] uppercase mr-1">Stage:</span>
            {STAGE_FILTERS.map((filter) => {
              const isSelected = selectedStage === filter.value;
              return (
                <Button
                  key={filter.value}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedStage(filter.value);
                    setPage(1);
                  }}
                  className={`h-7 text-xs font-normal rounded-[6px] px-2.5 ${
                    isSelected
                      ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset'
                      : 'border-[#eceae4] text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c]'
                  }`}
                >
                  {filter.label}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant={isReopenedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setIsReopenedOnly((prev) => !prev);
                setPage(1);
              }}
              className={`h-7 text-xs font-normal rounded-[6px] px-2.5 gap-1.5 ${
                isReopenedOnly
                  ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset'
                  : 'border-[#eceae4] text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c]'
              }`}
            >
              <FiRefreshCw className="h-3 w-3" />
              <span>Reopened Deals</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Floating Bulk Operations Toolbar (Managers Only) */}
      {isManager && selectedDealIds.length > 0 && (
        <div className="sticky top-20 z-20 flex items-center justify-between rounded-[10px] border border-[#1c1c1c] bg-[#1c1c1c] px-4 py-2.5 text-[#fcfbf8] shadow-focus-soft animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-[#fcfbf8] text-[#1c1c1c] font-semibold text-xs">
              {selectedDealIds.length} Selected
            </Badge>
            <span className="text-xs hidden sm:inline opacity-80">
              Apply batch changes across all selected opportunities
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkAdvance}
              disabled={bulkAdvanceMutation.isPending}
              className="h-7 text-xs bg-[#fcfbf8] text-[#1c1c1c] hover:bg-[#eceae4] border-transparent gap-1.5"
            >
              {bulkAdvanceMutation.isPending ? (
                <>
                  <FiLoader className="h-3.5 w-3.5 animate-spin text-[#1c1c1c]" />
                  <span>Advancing Deals...</span>
                </>
              ) : (
                <>
                  <FiArrowRight className="h-3.5 w-3.5" />
                  <span>Bulk Advance</span>
                </>
              )}
            </Button>

            {isManager && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkReassignOwnerId('');
                  setBulkError(null);
                  setIsBulkReassignOpen(true);
                }}
                className="h-7 text-xs bg-[#fcfbf8] text-[#1c1c1c] hover:bg-[#eceae4] border-transparent"
              >
                <FiUserCheck className="h-3.5 w-3.5 mr-1" />
                Reassign Owner
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearDealSelection}
              className="h-7 text-xs text-[#fcfbf8] hover:bg-white/10"
            >
              <FiX className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Deals Table Card */}
      <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl overflow-hidden shadow-2xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} columns={isManager ? 8 : 7} />
            </div>
          ) : isError ? (
            <div className="p-6">
              <ErrorState
                title="Failed to load deals"
                message={error?.message || 'Could not fetch deals from the database.'}
                onRetry={() => refetch()}
              />
            </div>
          ) : deals.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={FiDollarSign}
                title="No Deals Found"
                description={
                  debouncedSearch || selectedStage !== 'ALL'
                    ? 'No deals match your filter criteria. Try resetting filters.'
                    : 'There are currently no deals in the pipeline.'
                }
                actionLabel={debouncedSearch || selectedStage !== 'ALL' ? 'Reset Filters' : 'Create Deal'}
                onAction={
                  debouncedSearch || selectedStage !== 'ALL'
                    ? () => {
                        setSearchInput('');
                        setSelectedStage('ALL');
                      }
                    : openCreateModal
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#eceae4] bg-[#f7f4ed]/60 hover:bg-[#f7f4ed]/60">
                    {isManager && (
                      <TableHead className="w-10 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={handleSelectAll}
                          className="rounded border-[#eceae4] text-[#1c1c1c] focus:ring-0 cursor-pointer"
                          aria-label="Select all deals"
                        />
                      </TableHead>
                    )}
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Deal & Company
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4 text-right">
                      Value
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4 text-right">
                      Weighted
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4 text-center">
                      Stage & Probability
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Expected Close
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Deal Owner
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Collaborators
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => {
                    const isSelected = selectedDealIds.includes(deal.id);
                    const overdue = isDealOverdue(deal.expectedCloseDate, deal.stage);
                    const stageStyle = STAGE_BADGE_STYLES[deal.stage] || STAGE_BADGE_STYLES.NEW;
                    const probPct = Math.round(deal.stageProbability * 100);

                    const ownerInitials = deal.owner?.name
                      ? deal.owner.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : '—';

                    const isReopened = deal.previousStage !== null && deal.closedAt === null;

                    return (
                      <TableRow
                        key={deal.id}
                        onClick={() => navigate(`/deals/${deal.id}`)}
                        className={`border-b border-[#eceae4] cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#eceae4]/40' : 'hover:bg-[#f7f4ed]/70'
                        }`}
                      >
                        {/* Checkbox (Managers Only) */}
                        {isManager && (
                          <TableCell className="w-10 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleDealSelection(deal.id)}
                              className="rounded border-[#eceae4] text-[#1c1c1c] focus:ring-0 cursor-pointer"
                              aria-label={`Select ${deal.title}`}
                            />
                          </TableCell>
                        )}

                        {/* Title & Company */}
                        <TableCell className="py-3 px-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm text-[#1c1c1c] hover:underline">
                                {deal.title}
                              </span>
                              {isReopened && (
                                <Badge
                                  variant="outline"
                                  className="text-[0.625rem] font-medium px-1.5 py-0 bg-amber-50 text-amber-800 border-amber-300 gap-1 rounded-[4px] shrink-0"
                                >
                                  <FiRefreshCw className="h-2.5 w-2.5" />
                                  <span>Reopened</span>
                                </Badge>
                              )}
                            </div>
                            {deal.company && (
                              <div className="flex items-center gap-1 text-xs text-[#5f5f5d] mt-0.5">
                                <FiGlobe className="h-3 w-3" />
                                <span>{deal.company.name}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Exact Value */}
                        <TableCell className="py-3 px-4 text-right font-semibold text-sm text-[#1c1c1c]">
                          {formatCurrency(Number(deal.value))}
                        </TableCell>

                        {/* Weighted Value */}
                        <TableCell className="py-3 px-4 text-right text-xs text-[#5f5f5d] font-medium">
                          {formatCurrency(Number(deal.weightedValue))}
                        </TableCell>

                        {/* Stage & Probability Badge */}
                        <TableCell className="py-3 px-4 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <Badge
                              variant="secondary"
                              className={`text-[0.6875rem] font-medium px-2 py-0.5 border ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border}`}
                            >
                              {STAGE_LABELS[deal.stage]}
                            </Badge>
                            <span className="text-[0.625rem] text-[#5f5f5d]">
                              {probPct}% prob.
                            </span>
                          </div>
                        </TableCell>

                        {/* Expected Close Date */}
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-[#1c1c1c]">
                              {formatDate(deal.expectedCloseDate)}
                            </span>
                            {overdue && (
                              <Badge
                                variant="outline"
                                className="border-[#1c1c1c] bg-[#1c1c1c] text-[#fcfbf8] text-[0.5625rem] px-1.5 py-0 gap-0.5"
                              >
                                <FiAlertTriangle className="h-2.5 w-2.5" />
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Deal Owner */}
                        <TableCell className="py-3 px-4">
                          {deal.owner ? (
                            <div className="flex items-center gap-2">
                              <Avatar
                                fallback={ownerInitials}
                                className="h-6 w-6 text-[0.625rem] font-medium text-[#1c1c1c] bg-[#eceae4] border border-[#eceae4]"
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-[#1c1c1c]">
                                  {deal.owner.name}
                                </span>
                                <span className="text-[0.625rem] text-[#5f5f5d]">
                                  {deal.owner.email}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[#5f5f5d]">—</span>
                          )}
                        </TableCell>

                        {/* Collaborators Avatar Stack */}
                        <TableCell className="py-3 px-4">
                          {deal.collaborators && deal.collaborators.length > 0 ? (
                            <div
                              className="flex items-center -space-x-1.5 overflow-hidden"
                              title={`Collaborators: ${deal.collaborators
                                .map((c) => c.user?.name || 'Unknown')
                                .join(', ')}`}
                            >
                              {deal.collaborators.slice(0, 2).map((collab) => {
                                const initials = collab.user?.name
                                  ? collab.user.name
                                      .split(' ')
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join('')
                                      .toUpperCase()
                                  : '??';
                                return (
                                  <Avatar
                                    key={collab.userId}
                                    fallback={initials}
                                    className="h-6 w-6 text-[0.5625rem] font-semibold text-[#1c1c1c] bg-[#eceae4] border-2 border-[#fcfbf8] ring-1 ring-black/5"
                                  />
                                );
                              })}
                              {deal.collaborators.length > 2 && (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f4f2eb] border-2 border-[#fcfbf8] text-[0.5625rem] font-bold text-[#5f5f5d]">
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

          {/* Pagination Footer */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#eceae4] bg-[#f7f4ed]/30 px-4 py-3 sm:px-6">
              <div className="text-xs text-[#5f5f5d]">
                Showing page <span className="font-semibold text-[#1c1c1c]">{data.pagination.page}</span> of{' '}
                <span className="font-semibold text-[#1c1c1c]">{data.pagination.totalPages}</span> ({data.pagination.total} deals)
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.pagination.page <= 1}
                  className="h-8 border-[#eceae4] text-xs font-normal text-[#1c1c1c] hover:bg-[#eceae4]"
                >
                  <FiChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  className="h-8 border-[#eceae4] text-xs font-normal text-[#1c1c1c] hover:bg-[#eceae4]"
                >
                  Next
                  <FiChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Deal Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Deal</DialogTitle>
            <DialogDescription>Add a new revenue opportunity to your pipeline.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createError && (
              <div className="p-2 text-xs text-destructive bg-destructive/10 rounded-[6px]">
                {createError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="newDealTitle">Deal Title *</Label>
              <Input
                id="newDealTitle"
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                placeholder="e.g. Enterprise CRM License"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newDealCompany">Target Company *</Label>
              <Select
                id="newDealCompany"
                value={dealCompanyId}
                onChange={(e) => setDealCompanyId(e.target.value)}
                required
              >
                <option value="" disabled>Select a company...</option>
                {companiesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.industry})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newDealValue">Deal Value (₹ INR) *</Label>
              <Input
                id="newDealValue"
                type="number"
                step="0.01"
                min="1"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="e.g. 75000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newDealDate">Expected Close Date *</Label>
              <Input
                id="newDealDate"
                type="date"
                value={dealCloseDate}
                onChange={(e) => setDealCloseDate(e.target.value)}
                required
              />
            </div>
            {/* Deal Owner Assignment */}
            {isManager ? (
              <div className="space-y-1.5">
                <Label htmlFor="newDealOwner">Deal Owner *</Label>
                <UserSelector
                  id="newDealOwner"
                  value={dealOwnerId}
                  onChange={setDealOwnerId}
                  allowedRoles={['SALES_REP']}
                  placeholder="Select Sales Representative..."
                />
                <p className="text-[11px] text-[#5f5f5d]">
                  Managers must assign a Sales Representative as deal owner.
                </p>
              </div>
            ) : (
              <div className="rounded-[6px] bg-[#f7f4ed] p-2.5 text-xs text-[#5f5f5d] border border-[#eceae4]">
                <p>
                  <span className="font-medium text-[#1c1c1c]">Deal Owner:</span> You ({user?.name || 'Current User'}) will automatically be assigned as the deal owner.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createDealMutation.isPending}
                className="bg-[#1c1c1c] text-[#fcfbf8]"
              >
                {createDealMutation.isPending ? (
                  <>
                    <FiLoader className="h-3.5 w-3.5 mr-1.5 animate-spin text-[#fcfbf8]" />
                    <span>Creating Deal...</span>
                  </>
                ) : (
                  'Create Deal'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Reassign Modal */}
      <Dialog open={isBulkReassignOpen} onOpenChange={setIsBulkReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reassign Deals ({selectedDealIds.length})</DialogTitle>
            <DialogDescription>Assign all selected opportunities to a new owner.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkReassignSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulkOwner">New Owner *</Label>
              <UserSelector
                id="bulkOwner"
                value={bulkReassignOwnerId}
                onChange={setBulkReassignOwnerId}
                allowedRoles={['SALES_REP']}
                placeholder="Select new sales rep..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBulkReassignOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={bulkReassignMutation.isPending}
                className="bg-[#1c1c1c] text-[#fcfbf8]"
              >
                {bulkReassignMutation.isPending ? (
                  <>
                    <FiLoader className="h-3.5 w-3.5 mr-1.5 animate-spin text-[#fcfbf8]" />
                    <span>Reassigning Deals...</span>
                  </>
                ) : (
                  'Confirm Reassignment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
