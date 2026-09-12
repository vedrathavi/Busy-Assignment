import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiGlobe,
  FiArrowLeft,
  FiUser as UserIcon,
  FiBriefcase,
  FiPlus,
  FiEdit2,
  FiArchive,
  FiRefreshCw,
  FiClock,
  FiExternalLink,
  FiChevronRight,
} from 'react-icons/fi';
import {
  useCompanyDetail,
  useUpdateCompany,
  useArchiveCompany,
  useRestoreCompany,
} from '@/features/companies/useCompanies';
import { useDeals, useCreateDeal } from '@/features/deals/useDeals';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { STAGE_LABELS } from '@/features/deals/deals.types';
import { useAuth } from '@/features/auth/AuthContext';
import { UserSelector } from '@/components/common/UserSelector';

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const { data: company, isLoading: isCompanyLoading, error: companyError } = useCompanyDetail(id);
  const { data: dealsData, isLoading: isDealsLoading } = useDeals({
    companyId: id,
    limit: 50,
  });

  const updateCompanyMutation = useUpdateCompany();
  const archiveCompanyMutation = useArchiveCompany();
  const restoreCompanyMutation = useRestoreCompany();
  const createDealMutation = useCreateDeal();

  // Dialog states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isCreateDealOpen, setIsCreateDealOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editOwnerId, setEditOwnerId] = useState('');

  // Create deal state
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [dealDate, setDealDate] = useState('');

  const openEditModal = () => {
    if (!company) return;
    setEditName(company.name);
    setEditIndustry(company.industry);
    setEditWebsite(company.website || '');
    setEditOwnerId(company.ownerId || '');
    setActionError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setActionError(null);
    try {
      await updateCompanyMutation.mutateAsync({
        id,
        input: {
          name: editName.trim(),
          industry: editIndustry.trim(),
          website: editWebsite.trim() || null,
          ...(isManager && editOwnerId ? { ownerId: editOwnerId } : {}),
        },
      });
      setIsEditOpen(false);
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Failed to update company');
    }
  };

  const handleArchiveConfirm = async () => {
    if (!id) return;
    setActionError(null);
    try {
      await archiveCompanyMutation.mutateAsync(id);
      setIsArchiveOpen(false);
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Failed to archive company');
    }
  };

  const handleRestoreConfirm = async () => {
    if (!id) return;
    setActionError(null);
    try {
      await restoreCompanyMutation.mutateAsync(id);
      setIsRestoreOpen(false);
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Failed to restore company');
    }
  };

  const handleCreateDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setActionError(null);
    try {
      await createDealMutation.mutateAsync({
        title: dealTitle.trim(),
        companyId: id,
        value: dealValue.trim(),
        expectedCloseDate: dealDate,
      });
      setIsCreateDealOpen(false);
      setDealTitle('');
      setDealValue('');
      setDealDate('');
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Failed to create deal');
    }
  };

  if (isCompanyLoading) {
    return (
      <div className="space-y-6 w-full">
        <Skeleton className="h-8 w-48 bg-[#eceae4]" />
        <Skeleton className="h-40 w-full rounded-[12px] bg-[#eceae4]" />
        <Skeleton className="h-64 w-full rounded-[12px] bg-[#eceae4]" />
      </div>
    );
  }

  if (companyError || !company) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <FiGlobe className="mx-auto h-12 w-12 text-[#5f5f5d]/50" />
        <h2 className="mt-4 text-lg font-semibold text-[#1c1c1c]">Company not found</h2>
        <p className="mt-2 text-xs text-[#5f5f5d]">
          {companyError?.message || 'This company does not exist or you do not have permission to view it.'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/companies')}
          className="mt-6 gap-2"
        >
          <FiArrowLeft className="h-4 w-4" /> Back to Companies
        </Button>
      </div>
    );
  }

  const deals = dealsData?.deals || [];
  const totalPipelineValue = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);

  return (
    <div className="space-y-6 w-full flex-1 flex flex-col animate-in fade-in duration-200">
      {/* Navigation Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5f5f5d]">
        <button
          type="button"
          onClick={() => navigate('/companies')}
          title="Back to Companies"
          aria-label="Back to Companies"
          className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#eceae4] bg-[#fcfbf8] text-[#5f5f5d] shadow-2xs transition-colors hover:bg-[#eceae4] hover:text-[#1c1c1c] cursor-pointer"
        >
          <FiArrowLeft className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-1 rounded-[6px] border border-[#eceae4] bg-[#fcfbf8] px-1.5 py-1 shadow-2xs">
          <Link
            to="/companies"
            className="rounded-[4px] px-2 py-0.5 font-medium text-[#5f5f5d] transition-colors hover:bg-[#eceae4] hover:text-[#1c1c1c]"
          >
            Companies
          </Link>

          <FiChevronRight className="h-3 w-3 text-[#5f5f5d]/50 shrink-0" />

          <span className="rounded-[4px] bg-[#eceae4] px-2 py-0.5 font-semibold text-[#1c1c1c] truncate max-w-[240px]">
            {company.name}
          </span>
        </div>
      </nav>

      {actionError && (
        <div className="rounded-[8px] border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {actionError}
        </div>
      )}

      {/* Main Company Header Card */}
      <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset">
                <FiGlobe className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold tracking-tight text-[#1c1c1c]">{company.name}</h1>
                  <Badge
                    variant={company.isArchived ? 'secondary' : 'default'}
                    className="text-xs px-2 py-0.5"
                  >
                    {company.isArchived ? 'Archived' : 'Active'}
                  </Badge>
                  <span className="text-xs text-[#5f5f5d] bg-[#eceae4]/70 px-2 py-0.5 rounded-[4px]">
                    {company.industry}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-[#5f5f5d] flex-wrap">
                  {company.website && (
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#1c1c1c] hover:underline"
                    >
                      <FiGlobe className="h-3.5 w-3.5" />
                      <span>{company.website.replace(/^https?:\/\//, '')}</span>
                      <FiExternalLink className="h-3 w-3 text-[#5f5f5d]" />
                    </a>
                  )}
                  <div className="flex items-center gap-1.5 bg-[#eceae4]/70 px-2.5 py-1 rounded-[6px]">
                    <UserIcon className="h-3.5 w-3.5 text-[#5f5f5d]" />
                    <span>
                      Company Owner: <strong className="text-[#1c1c1c] font-semibold">{company.owner?.name || 'Unassigned'}</strong>
                      {company.owner && (
                        <span className="text-[10px] text-[#5f5f5d] font-normal ml-1">
                          (Sales Rep)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FiClock className="h-3.5 w-3.5" />
                    <span>Added {formatDate(company.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-start flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={openEditModal}
                className="text-xs gap-1.5 border-[#eceae4]"
              >
                <FiEdit2 className="h-3.5 w-3.5" /> Edit
              </Button>
              {company.isArchived ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionError(null);
                    setIsRestoreOpen(true);
                  }}
                  className="text-xs gap-1.5 text-emerald-700 hover:text-emerald-800"
                >
                  <FiRefreshCw className="h-3.5 w-3.5" /> Restore
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionError(null);
                    setIsArchiveOpen(true);
                  }}
                  className="text-xs gap-1.5 text-amber-700 hover:text-amber-800"
                >
                  <FiArchive className="h-3.5 w-3.5" /> Archive
                </Button>
              )}
              {!company.isArchived && (
                <Button
                  size="sm"
                  onClick={() => {
                    setActionError(null);
                    setIsCreateDealOpen(true);
                  }}
                  className="text-xs gap-1.5 bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset"
                >
                  <FiPlus className="h-3.5 w-3.5" /> Create Deal
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Associated Deals Section */}
      <Card className="flex-1 flex flex-col border border-[#eceae4] bg-[#fcfbf8] shadow-2xs min-h-[360px] rounded-xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-[#eceae4]/70 flex flex-row items-center justify-between shrink-0">
          <div>
            <CardTitle className="text-base font-semibold text-[#1c1c1c] flex items-center gap-2">
              <FiBriefcase className="h-4 w-4" />
              <span>Associated Deals ({deals.length})</span>
            </CardTitle>
            <p className="text-xs text-[#5f5f5d] mt-0.5">
              Total pipeline value: <strong className="text-[#1c1c1c] font-semibold">{formatCurrency(totalPipelineValue)}</strong>
            </p>
          </div>
          {!company.isArchived && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActionError(null);
                setIsCreateDealOpen(true);
              }}
              className="text-xs gap-1"
            >
              <FiPlus className="h-3.5 w-3.5" /> Add Deal
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {isDealsLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full bg-[#eceae4]" />
              <Skeleton className="h-10 w-full bg-[#eceae4]" />
            </div>
          ) : deals.length === 0 ? (
            <div className="py-12 text-center">
              <FiBriefcase className="mx-auto h-8 w-8 text-[#5f5f5d]/40" />
              <p className="mt-2 text-sm font-medium text-[#1c1c1c]">No deals yet</p>
              <p className="text-xs text-[#5f5f5d]">Create a deal for this company to start tracking pipeline value.</p>
              {!company.isArchived && (
                <Button
                  size="sm"
                  onClick={() => setIsCreateDealOpen(true)}
                  className="mt-4 text-xs bg-[#1c1c1c] text-[#fcfbf8]"
                >
                  <FiPlus className="h-3.5 w-3.5 mr-1" /> Create First Deal
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#eceae4]/70">
              {deals.map((deal) => (
                <Link
                  key={deal.id}
                  to={`/deals/${deal.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[rgba(28,28,28,0.02)] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#eceae4] text-[#1c1c1c] group-hover:bg-[#1c1c1c] group-hover:text-[#fcfbf8] transition-colors">
                      <FiBriefcase className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1c1c1c] truncate group-hover:underline">
                        {deal.title}
                      </p>
                      <p className="text-xs text-[#5f5f5d] truncate">
                        Deal Owner: <span className="font-medium text-[#1c1c1c]">{deal.owner?.name || 'Unassigned'}</span> • Expected {formatDate(deal.expectedCloseDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className="text-xs font-normal">
                      {STAGE_LABELS[deal.stage]}
                    </Badge>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#1c1c1c]">{formatCurrency(Number(deal.value))}</p>
                      <p className="text-[0.6875rem] text-[#5f5f5d]">
                        W: {formatCurrency(Number(deal.weightedValue))}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Company Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company details and online properties.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyIndustry">Industry *</Label>
              <Input
                id="companyIndustry"
                value={editIndustry}
                onChange={(e) => setEditIndustry(e.target.value)}
                required
                placeholder="e.g. Cloud Infrastructure"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyWebsite">Website</Label>
              <Input
                id="companyWebsite"
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
                placeholder="e.g. https://acme.com"
              />
            </div>
            {isManager && (
              <div className="space-y-1.5">
                <Label htmlFor="companyOwner">Company Owner</Label>
                <UserSelector
                  id="companyOwner"
                  value={editOwnerId}
                  onChange={(newOwnerId) => setEditOwnerId(newOwnerId)}
                  allowedRoles={['SALES_REP']}
                  placeholder="Select Sales Representative..."
                />
                <p className="text-[11px] text-[#5f5f5d]">
                  Managers can reassign company ownership to any Sales Representative.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
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
        open={isArchiveOpen}
        onOpenChange={setIsArchiveOpen}
        title="Archive Company?"
        description="Archiving will mark this company as inactive. You will not be able to create new deals under it until restored."
        confirmText="Archive Company"
        variant="destructive"
        isLoading={archiveCompanyMutation.isPending}
        onConfirm={handleArchiveConfirm}
      />

      {/* Restore Company Confirmation */}
      <AlertDialog
        open={isRestoreOpen}
        onOpenChange={setIsRestoreOpen}
        title="Restore Company?"
        description="This will reactivate the company and allow new deals to be added."
        confirmText="Restore Company"
        variant="default"
        isLoading={restoreCompanyMutation.isPending}
        onConfirm={handleRestoreConfirm}
      />

      {/* Create Deal for Company Dialog */}
      <Dialog open={isCreateDealOpen} onOpenChange={setIsCreateDealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Deal for {company.name}</DialogTitle>
            <DialogDescription>Add a new sales opportunity to your pipeline.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDealSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dealTitle">Deal Title *</Label>
              <Input
                id="dealTitle"
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
                required
                placeholder="e.g. Annual Enterprise License"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dealValue">Deal Value (₹ INR) *</Label>
              <Input
                id="dealValue"
                type="number"
                step="0.01"
                min="1"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                required
                placeholder="e.g. 50000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dealDate">Expected Close Date *</Label>
              <Input
                id="dealDate"
                type="date"
                value={dealDate}
                onChange={(e) => setDealDate(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateDealOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createDealMutation.isPending}
                className="bg-[#1c1c1c] text-[#fcfbf8]"
              >
                {createDealMutation.isPending ? 'Creating...' : 'Create Deal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
