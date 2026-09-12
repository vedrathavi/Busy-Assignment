import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FiGlobe,
  FiSearch,
  FiExternalLink,
  FiChevronLeft,
  FiChevronRight,
  FiArchive,
  FiRefreshCw,
  FiPlus,
  FiMoreHorizontal,
  FiEdit2,
  FiEye,
  FiAlertTriangle,
  FiChevronDown,
} from 'react-icons/fi';
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useArchiveCompany,
  useRestoreCompany,
  useSimilarCompanies,
} from '@/features/companies/useCompanies';
import { useAuth } from '@/features/auth/AuthContext';
import { UserSelector } from '@/components/common/UserSelector';

import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { AlertDialog } from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableSkeleton } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { formatDate } from '@/lib/utils';
import { Company } from '@/features/companies/companies.types';

export function CompaniesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = searchParams.get('search') || '';
  const urlStatus = (searchParams.get('isArchived') as 'false' | 'true' | 'all') || 'false';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, 250);
  const [statusFilter, setStatusFilter] = useState<'false' | 'true' | 'all'>(urlStatus);
  const [page, setPage] = useState(urlPage);
  const limit = 10;

  // Sync debounced search with URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    params.set('isArchived', statusFilter);
    params.set('page', page.toString());
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, statusFilter, page]);

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      isArchived: statusFilter,
      page,
      limit,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
    }),
    [debouncedSearch, statusFilter, page]
  );

  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const { data, isLoading, isError, error, refetch, isFetching } = useCompanies(queryParams);
  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();
  const archiveCompanyMutation = useArchiveCompany();
  const restoreCompanyMutation = useRestoreCompany();

  // Modal dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [archiveCompanyTarget, setArchiveCompanyTarget] = useState<Company | null>(null);
  const [restoreCompanyTarget, setRestoreCompanyTarget] = useState<Company | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [ownerId, setOwnerId] = useState('');

  // Debounced name for advisory similar companies search (>= 2 chars, 300ms)
  const debouncedCompanyName = useDebounce(name, 300);
  const { data: similarCompanies = [] } = useSimilarCompanies(
    isCreateOpen ? debouncedCompanyName : ''
  );

  const openCreateDialog = () => {
    setName('');
    setIndustry('');
    setWebsite('');
    setOwnerId('');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditDialog = (company: Company) => {
    setEditCompany(company);
    setName(company.name);
    setIndustry(company.industry);
    setWebsite(company.website || '');
    setOwnerId(company.ownerId || '');
    setFormError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isManager && !ownerId) {
      setFormError('Please select a Sales Representative to own this company.');
      return;
    }

    try {
      await createCompanyMutation.mutateAsync({
        name: name.trim(),
        industry: industry.trim(),
        website: website.trim() || null,
        ownerId: isManager ? ownerId : undefined,
      });
      setIsCreateOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create company');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCompany) return;
    setFormError(null);
    try {
      await updateCompanyMutation.mutateAsync({
        id: editCompany.id,
        input: {
          name: name.trim(),
          industry: industry.trim(),
          website: website.trim() || null,
          ...(isManager && ownerId ? { ownerId } : {}),
        },
      });
      setEditCompany(null);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to update company');
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveCompanyTarget) return;
    try {
      await archiveCompanyMutation.mutateAsync(archiveCompanyTarget.id);
      setArchiveCompanyTarget(null);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to archive company');
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreCompanyTarget) return;
    try {
      await restoreCompanyMutation.mutateAsync(restoreCompanyTarget.id);
      setRestoreCompanyTarget(null);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to restore company');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200 w-full">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1c1c1c] sm:text-3xl">
              Companies
            </h1>
            {data?.pagination && (
              <Badge variant="outline" className="text-xs font-normal text-[#5f5f5d] border-[#eceae4]">
                {data.pagination.total} Total
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#5f5f5d] mt-1.5 leading-relaxed">
            Manage organization accounts, prospect companies, and client relations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-[#eceae4] text-[#1c1c1c] hover:bg-[#eceae4]"
            aria-label="Refresh companies"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset gap-1.5"
          >
            <FiPlus className="h-4 w-4" />
            <span>Create Company</span>
          </Button>
        </div>
      </div>

      {formError && (
        <div className="rounded-[8px] border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {formError}
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="border border-[#eceae4] bg-[#fcfbf8] rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input with Debounce */}
          <div className="relative flex-1 sm:max-w-md">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f5f5d]" />
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="Search companies by name or industry..."
              className="pl-9 bg-[#f7f4ed] border-[#eceae4] rounded-[6px] text-xs focus-visible:border-[rgba(28,28,28,0.4)]"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <Button
              variant={statusFilter === 'false' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('false');
                setPage(1);
              }}
              className={`h-8 text-xs font-normal rounded-[6px] ${
                statusFilter === 'false'
                  ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset'
                  : 'border-[#eceae4] text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c]'
              }`}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setPage(1);
              }}
              className={`h-8 text-xs font-normal rounded-[6px] ${
                statusFilter === 'all'
                  ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset'
                  : 'border-[#eceae4] text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c]'
              }`}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'true' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('true');
                setPage(1);
              }}
              className={`h-8 text-xs font-normal rounded-[6px] ${
                statusFilter === 'true'
                  ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset'
                  : 'border-[#eceae4] text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c]'
              }`}
            >
              <FiArchive className="h-3 w-3 mr-1" />
              Archived
            </Button>
          </div>
        </div>
      </Card>

      {/* Table Content */}
      <Card className="border border-[#eceae4] bg-[#fcfbf8] flex-1 rounded-xl overflow-hidden shadow-2xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} columns={6} />
            </div>
          ) : isError ? (
            <div className="p-6">
              <ErrorState
                title="Failed to load companies"
                message={error?.message || 'Could not fetch companies from the database.'}
                onRetry={() => refetch()}
              />
            </div>
          ) : !data?.companies || data.companies.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={FiGlobe}
                title="No Companies Found"
                description={
                  debouncedSearch
                    ? `No companies match "${debouncedSearch}". Try adjusting your search query.`
                    : 'There are no companies in this filter view.'
                }
                actionLabel={debouncedSearch ? 'Clear Search' : 'Create Company'}
                onAction={
                  debouncedSearch
                    ? () => {
                        setSearchInput('');
                        setPage(1);
                      }
                    : openCreateDialog
                }
              />
            </div>
          ) : (
            <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#eceae4] bg-[#f7f4ed]/60 hover:bg-[#f7f4ed]/60">
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Company Name
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Industry
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Company Owner
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4 text-center">
                      Deals
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Created
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-medium text-[#5f5f5d] uppercase tracking-wider py-3 px-4 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.companies.map((company) => {
                    const initials = company.owner?.name
                      ? company.owner.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : '—';

                    return (
                      <TableRow
                        key={company.id}
                        onClick={() => navigate(`/companies/${company.id}`)}
                        className="border-b border-[#eceae4] cursor-pointer transition-colors hover:bg-[#f7f4ed]/70"
                      >
                        {/* Company Name + Website */}
                        <TableCell className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-[#1c1c1c] hover:underline">
                              {company.name}
                            </span>
                            {company.website ? (
                              <a
                                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[0.6875rem] text-[#5f5f5d] hover:text-[#1c1c1c] hover:underline mt-0.5"
                              >
                                <span>{company.website.replace(/^https?:\/\//, '')}</span>
                                <FiExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : (
                              <span className="text-[0.6875rem] text-[#5f5f5d]">No website</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Industry */}
                        <TableCell className="py-3 px-4">
                          <Badge
                            variant="secondary"
                            className="bg-[#eceae4] text-[#1c1c1c] font-normal text-xs px-2 py-0.5"
                          >
                            {company.industry}
                          </Badge>
                        </TableCell>

                        {/* Account Owner */}
                        <TableCell className="py-3 px-4">
                          {company.owner ? (
                            <div className="flex items-center gap-2">
                              <Avatar
                                fallback={initials}
                                className="h-6 w-6 text-[0.625rem] font-medium text-[#1c1c1c] bg-[#eceae4] border border-[#eceae4]"
                              />
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-[#1c1c1c]">
                                  {company.owner.name}
                                </span>
                                <span className="text-[0.625rem] text-[#5f5f5d]">
                                  {company.owner.email}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[#5f5f5d]">—</span>
                          )}
                        </TableCell>

                        {/* Deals Count */}
                        <TableCell className="py-3 px-4 text-center">
                          <Badge
                            variant="outline"
                            className="font-medium text-xs border-[#eceae4] text-[#1c1c1c] px-2 py-0.5"
                          >
                            {company._count?.deals || 0}
                          </Badge>
                        </TableCell>

                        {/* Created Date */}
                        <TableCell className="py-3 px-4 text-xs text-[#5f5f5d]">
                          {formatDate(company.createdAt)}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3 px-4">
                          {company.isArchived ? (
                            <Badge
                              variant="outline"
                              className="text-[0.6875rem] text-[#5f5f5d] border-[#eceae4] bg-[#eceae4]/50"
                            >
                              Archived
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[0.6875rem] text-[#1c1c1c] border-[#eceae4] bg-[#fcfbf8]"
                            >
                              Active
                            </Badge>
                          )}
                        </TableCell>

                        {/* Actions Menu */}
                        <TableCell className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-[4px] p-0 text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c]"
                              >
                                <FiMoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-[#fcfbf8] border-[#eceae4]">
                              <DropdownMenuItem
                                onClick={() => navigate(`/companies/${company.id}`)}
                                className="text-xs gap-2 cursor-pointer"
                              >
                                <FiEye className="h-3.5 w-3.5" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEditDialog(company)}
                                className="text-xs gap-2 cursor-pointer"
                              >
                                <FiEdit2 className="h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                              {(isManager || (user?.id && company.ownerId === user.id)) && (
                                company.isArchived ? (
                                  <DropdownMenuItem
                                    onClick={() => setRestoreCompanyTarget(company)}
                                    className="text-xs gap-2 cursor-pointer text-emerald-700 focus:text-emerald-700"
                                  >
                                    <FiRefreshCw className="h-3.5 w-3.5" /> Restore
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => setArchiveCompanyTarget(company)}
                                    className="text-xs gap-2 cursor-pointer text-destructive focus:text-destructive"
                                  >
                                    <FiArchive className="h-3.5 w-3.5" /> Archive
                                  </DropdownMenuItem>
                                )
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
          )}

          {/* Pagination Footer */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#eceae4] bg-[#f7f4ed]/30 px-4 py-3 sm:px-6">
              <div className="text-xs text-[#5f5f5d]">
                Showing page <span className="font-semibold text-[#1c1c1c]">{data.pagination.page}</span> of{' '}
                <span className="font-semibold text-[#1c1c1c]">{data.pagination.totalPages}</span> ({data.pagination.total} companies)
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

      {/* Create Company Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>Add a new company or client account to your CRM.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-[6px] bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="createName">Company Name *</Label>
              <Input
                id="createName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Apex Dynamics Inc."
              />
            </div>

            {/* Advisory Similar Company Dropdown Banner */}
            {similarCompanies.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs animate-in fade-in-50 duration-150">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FiAlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-amber-900">Similar company already exists</span>
                      <span className="text-amber-700 text-[11px] hidden sm:inline">
                        ({similarCompanies.length} match{similarCompanies.length > 1 ? 'es' : ''})
                      </span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100/60 gap-1.5 shadow-2xs shrink-0"
                      >
                        <span>
                          View {similarCompanies.length} {similarCompanies.length === 1 ? 'company' : 'companies'}
                        </span>
                        <FiChevronDown className="h-3.5 w-3.5 text-amber-800" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[340px] sm:w-[380px] p-2 space-y-1.5 max-h-72 overflow-y-auto bg-[#fcfbf8] border-[#eceae4] shadow-focus-soft"
                    >
                      <div className="px-2 py-1 text-[11px] text-[#5f5f5d] border-b border-[#eceae4]/70 mb-1">
                        Existing accounts in your organization:
                      </div>
                      {similarCompanies.map((sim) => (
                        <div
                          key={sim.id}
                          className="flex items-center justify-between gap-2.5 p-2.5 rounded-md bg-white border border-[#eceae4] text-xs hover:border-[#1c1c1c]/30 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[#1c1c1c] truncate">{sim.name}</span>
                              {sim.industry && (
                                <span className="rounded-[4px] bg-[#eceae4] px-1.5 py-0.5 text-[9px] text-[#5f5f5d]">
                                  {sim.industry}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#5f5f5d] mt-1">
                              <span>
                                {sim.activeDealsCount} active {sim.activeDealsCount === 1 ? 'deal' : 'deals'}
                              </span>
                              {sim.owner && (
                                <span className="ml-1.5">
                                  • Owner: <strong className="text-[#1c1c1c] font-medium">{sim.owner.name}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsCreateOpen(false);
                              navigate(`/companies/${sim.id}`);
                            }}
                            className="h-7 text-[11px] shrink-0 text-[#1c1c1c] border-[#eceae4] hover:bg-[#eceae4] gap-1 px-2.5"
                          >
                            <FiExternalLink className="h-3 w-3" />
                            View
                          </Button>
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="createIndustry">Industry *</Label>
              <Input
                id="createIndustry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                placeholder="e.g. Enterprise Software"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="createWebsite">Website</Label>
              <Input
                id="createWebsite"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g. https://apexdynamics.com"
              />
            </div>

            {/* Company Owner Assignment */}
            {isManager ? (
              <div className="space-y-1.5">
                <Label htmlFor="createOwner">Company Owner *</Label>
                <UserSelector
                  id="createOwner"
                  value={ownerId}
                  onChange={(id) => setOwnerId(id)}
                  allowedRoles={['SALES_REP']}
                  placeholder="Select Sales Representative..."
                />
                <p className="text-[11px] text-[#5f5f5d]">
                  Managers must assign a Sales Representative as company owner.
                </p>
              </div>
            ) : (
              <div className="rounded-[6px] bg-[#f7f4ed] p-2.5 text-xs text-[#5f5f5d] border border-[#eceae4]">
                <p>
                  <span className="font-medium text-[#1c1c1c]">Company Owner:</span> You ({user?.name || 'Current User'}) will automatically be assigned as the company owner.
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
                disabled={createCompanyMutation.isPending}
                className="bg-[#1c1c1c] text-[#fcfbf8]"
              >
                {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={Boolean(editCompany)} onOpenChange={(open) => !open && setEditCompany(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-[6px] bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="editName">Company Name *</Label>
              <Input
                id="editName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editIndustry">Industry *</Label>
              <Input
                id="editIndustry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editWebsite">Website</Label>
              <Input
                id="editWebsite"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            {isManager && (
              <div className="space-y-1.5">
                <Label htmlFor="editOwner">Company Owner</Label>
                <UserSelector
                  id="editOwner"
                  value={ownerId}
                  onChange={(id) => setOwnerId(id)}
                  allowedRoles={['SALES_REP']}
                  placeholder="Select Sales Representative..."
                />
                <p className="text-[11px] text-[#5f5f5d]">
                  Managers can reassign company ownership to any Sales Representative.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditCompany(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateCompanyMutation.isPending}
                className="bg-[#1c1c1c] text-[#fcfbf8]"
              >
                {updateCompanyMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive Company Confirmation */}
      <AlertDialog
        open={Boolean(archiveCompanyTarget)}
        onOpenChange={(open) => !open && setArchiveCompanyTarget(null)}
        title="Archive Company?"
        description={`Are you sure you want to archive "${archiveCompanyTarget?.name}"? New deals cannot be created while archived.`}
        confirmText="Archive Company"
        variant="destructive"
        isLoading={archiveCompanyMutation.isPending}
        onConfirm={handleArchiveConfirm}
      />

      {/* Restore Company Confirmation */}
      <AlertDialog
        open={Boolean(restoreCompanyTarget)}
        onOpenChange={(open) => !open && setRestoreCompanyTarget(null)}
        title="Restore Company?"
        description={`Restore "${restoreCompanyTarget?.name}" to active status?`}
        confirmText="Restore Company"
        variant="default"
        isLoading={restoreCompanyMutation.isPending}
        onConfirm={handleRestoreConfirm}
      />
    </div>
  );
}
