import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiBriefcase as Briefcase,
  FiArrowLeft as ArrowLeft,
  FiGlobe as Building2,
  FiCalendar as Calendar,
  FiUser as UserIcon,
  FiUsers as Users,
  FiMessageSquare as MessageSquare,
  FiClock as History,
  FiCheckCircle as CheckCircle2,
  FiXCircle as XCircle,
  FiAlertTriangle as AlertTriangle,
  FiArrowRight as ArrowRight,
  FiRotateCcw as RotateCcw,
  FiTrash2 as Trash2,
  FiEdit2 as Edit2,
  FiSend as Send,
  FiUserPlus as UserPlus,
  FiUserMinus as UserMinus,
  FiChevronRight as ChevronRight,
  FiLoader,
  FiCheckSquare as CheckSquare,
  FiPlus as Plus,
} from 'react-icons/fi';
import {
  useDealDetail,
  useUpdateDeal,
  useTransitionDealStage,
  useReopenDeal,
  useDeleteDeal,
  useCollaborators,
  useAddCollaborator,
  useRemoveCollaborator,
  useDealHistory,
  useAddDealNote,
  useDeals,
} from '@/features/deals/useDeals';
import { useDealTasks } from '@/features/tasks/useTasks';
import { TaskCard } from '@/features/tasks/TaskCard';
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog';
import { Task } from '@/features/tasks/tasks.types';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { UserSelector } from '@/components/common/UserSelector';
import { toast } from 'sonner';
import {
  formatCurrency,
  formatDate,
  getDaysOverdue,
} from '@/lib/utils';
import {
  DealStage,
  STAGE_ORDER,
  STAGE_LABELS,
  STAGE_PROBABILITY,
} from '@/features/deals/deals.types';

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isManager } = useAuth();

  const { data: deal, isLoading: isDealLoading, error: dealError } = useDealDetail(id);
  const { data: collaborators = [], isLoading: isCollabLoading } = useCollaborators(id);
  const { data: historyEvents = [], isLoading: isHistoryLoading } = useDealHistory(id);
  const { data: dealTasksData, isLoading: isTasksLoading } = useDealTasks(id);
  const dealTasks = dealTasksData?.tasks || [];
  const openDealTasks = dealTasks.filter((t) => !t.completedAt);
  const completedDealTasks = dealTasks.filter((t) => Boolean(t.completedAt));

  // Fetch sibling deals from same company
  const { data: siblingDealsData } = useDeals({
    companyId: deal?.companyId,
    limit: 10,
  });

  const updateDealMutation = useUpdateDeal();
  const transitionStageMutation = useTransitionDealStage();
  const isTransitioning = transitionStageMutation.isPending;
  const targetStage = transitionStageMutation.variables?.stage;
  const reopenDealMutation = useReopenDeal();
  const deleteDealMutation = useDeleteDeal();
  const addCollaboratorMutation = useAddCollaborator();
  const removeCollaboratorMutation = useRemoveCollaborator();
  const addNoteMutation = useAddDealNote();

  // Dialog states
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBackwardOpen, setIsBackwardOpen] = useState(false);
  const [isLostOpen, setIsLostOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [isAddCollaboratorOpen, setIsAddCollaboratorOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [targetBackwardStage, setTargetBackwardStage] = useState<DealStage>('NEW');
  const [backwardReason, setBackwardReason] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [newNote, setNewNote] = useState('');
  const [collaboratorUserId, setCollaboratorUserId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editOwnerId, setEditOwnerId] = useState('');

  const openEditModal = () => {
    if (!deal) return;
    setEditTitle(deal.title);
    setEditValue(deal.value);
    setEditDate(deal.expectedCloseDate);
    setEditOwnerId(deal.ownerId || '');
    setActionError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setActionError(null);
    try {
      await updateDealMutation.mutateAsync({
        id,
        input: {
          title: editTitle.trim(),
          value: editValue.trim(),
          expectedCloseDate: editDate,
          ...(isManager && editOwnerId.trim() && editOwnerId.trim() !== deal?.ownerId
            ? { ownerId: editOwnerId.trim() }
            : {}),
        },
      });
      setIsEditOpen(false);
      toast.success('Deal details updated successfully');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update deal';
      setActionError(msg);
      toast.error(msg);
    }
  };

  // Stage Transitions
  const handleAdvanceStage = async (nextStage: DealStage) => {
    if (!id) return;
    setActionError(null);
    try {
      await transitionStageMutation.mutateAsync({
        id,
        stage: nextStage,
      });
      toast.success(`Deal advanced to ${nextStage}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to transition stage';
      setActionError(msg);
      toast.error(msg);
    }
  };

  const openBackwardModal = (prevStage: DealStage) => {
    setTargetBackwardStage(prevStage);
    setBackwardReason('');
    setActionError(null);
    setIsBackwardOpen(true);
  };

  const handleBackwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!backwardReason.trim()) {
      setActionError('Reason is mandatory when moving a deal backward');
      return;
    }
    setActionError(null);
    try {
      await transitionStageMutation.mutateAsync({
        id,
        stage: targetBackwardStage,
        reason: backwardReason.trim(),
      });
      setIsBackwardOpen(false);
      toast.success(`Deal moved backward to ${targetBackwardStage}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to regress stage';
      setActionError(msg);
      toast.error(msg);
    }
  };

  const openLostModal = () => {
    setLostReason('');
    setActionError(null);
    setIsLostOpen(true);
  };

  const handleLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!lostReason.trim()) {
      setActionError('Reason is mandatory when marking a deal as Lost');
      return;
    }
    setActionError(null);
    try {
      await transitionStageMutation.mutateAsync({
        id,
        stage: 'LOST',
        reason: lostReason.trim(),
      });
      setIsLostOpen(false);
      toast.success('Deal marked as Lost');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to mark deal as Lost';
      setActionError(msg);
      toast.error(msg);
    }
  };

  const handleReopenConfirm = async () => {
    if (!id) return;
    setActionError(null);
    try {
      await reopenDealMutation.mutateAsync(id);
      setIsReopenOpen(false);
      toast.success('Deal reopened successfully');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to reopen deal';
      setActionError(msg);
      toast.error(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;
    setActionError(null);
    try {
      await deleteDealMutation.mutateAsync(id);
      toast.success('Deal moved to trash');
      navigate('/deals');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete deal';
      setActionError(msg);
      toast.error(msg);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newNote.trim()) return;
    setActionError(null);
    try {
      await addNoteMutation.mutateAsync({
        dealId: id,
        note: newNote.trim(),
      });
      setNewNote('');
      toast.success('Note added successfully');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to add note';
      setActionError(msg);
      toast.error(msg);
    }
  };

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !collaboratorUserId.trim()) return;
    setActionError(null);
    try {
      await addCollaboratorMutation.mutateAsync({
        dealId: id,
        userId: collaboratorUserId.trim(),
      });
      setCollaboratorUserId('');
      setIsAddCollaboratorOpen(false);
      toast.success('Collaborator added successfully');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to add collaborator';
      setActionError(msg);
      toast.error(msg);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!id) return;
    setActionError(null);
    try {
      await removeCollaboratorMutation.mutateAsync({
        dealId: id,
        userId,
      });
      toast.success('Collaborator removed');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to remove collaborator';
      setActionError(msg);
      toast.error(msg);
    }
  };

  if (isDealLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-48 bg-[#eceae4]" />
        <Skeleton className="h-44 w-full rounded-[12px] bg-[#eceae4]" />
        <Skeleton className="h-96 w-full rounded-[12px] bg-[#eceae4]" />
      </div>
    );
  }

  if (dealError || !deal) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <Briefcase className="mx-auto h-12 w-12 text-[#5f5f5d]/50" />
        <h2 className="mt-4 text-lg font-semibold text-[#1c1c1c]">Deal not found</h2>
        <p className="mt-2 text-xs text-[#5f5f5d]">
          {dealError?.message || 'This deal does not exist or you do not have permission to view it.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/deals')} className="mt-6 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Deals
        </Button>
      </div>
    );
  }

  const daysOverdue = getDaysOverdue(deal.expectedCloseDate);
  const isOverdue = daysOverdue > 0 && deal.stage !== 'WON' && deal.stage !== 'LOST';
  const isClosed = deal.stage === 'WON' || deal.stage === 'LOST';

  // Stage order indexes
  const currentStageIndex = STAGE_ORDER.indexOf(deal.stage);
  const nextStage = currentStageIndex < 3 ? STAGE_ORDER[currentStageIndex + 1] : null;

  // Sibling deals excluding current deal
  const otherCompanyDeals = (siblingDealsData?.deals || []).filter((d) => d.id !== deal.id);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* Navigation Breadcrumbs & Top Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5f5f5d]">
          <button
            type="button"
            onClick={() => navigate('/deals')}
            title="Back to Deals"
            aria-label="Back to Deals"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#eceae4] bg-[#fcfbf8] text-[#5f5f5d] shadow-2xs transition-colors hover:bg-[#eceae4] hover:text-[#1c1c1c] cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-1 rounded-[6px] border border-[#eceae4] bg-[#fcfbf8] px-1.5 py-1 shadow-2xs">
            <Link
              to="/deals"
              className="rounded-[4px] px-2 py-0.5 font-medium text-[#5f5f5d] transition-colors hover:bg-[#eceae4] hover:text-[#1c1c1c]"
            >
              Deals
            </Link>

            <ChevronRight className="h-3 w-3 text-[#5f5f5d]/50 shrink-0" />

            {deal.company && (
              <>
                <Link
                  to={`/companies/${deal.company.id}`}
                  className="rounded-[4px] px-2 py-0.5 font-medium text-[#5f5f5d] transition-colors hover:bg-[#eceae4] hover:text-[#1c1c1c] truncate max-w-[150px]"
                >
                  {deal.company.name}
                </Link>
                <ChevronRight className="h-3 w-3 text-[#5f5f5d]/50 shrink-0" />
              </>
            )}

            <span className="rounded-[4px] bg-[#eceae4] px-2 py-0.5 font-semibold text-[#1c1c1c] truncate max-w-[220px]">
              {deal.title}
            </span>
          </div>
        </nav>

        {/* Top actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEditModal} className="text-xs gap-1.5 border-[#eceae4]">
            <Edit2 className="h-3.5 w-3.5" /> Edit Deal
          </Button>
          {(isManager || deal.ownerId === user?.id) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActionError(null);
                setIsDeleteOpen(true);
              }}
              className="text-xs gap-1.5 text-destructive hover:bg-destructive/10 border-[#eceae4]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-[8px] border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {actionError}
        </div>
      )}

      {/* Main Deal Summary Card */}
      <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold tracking-tight text-[#1c1c1c]">{deal.title}</h1>
                  <Badge
                    variant={deal.stage === 'WON' ? 'default' : deal.stage === 'LOST' ? 'destructive' : 'outline'}
                    className="text-xs px-2.5 py-0.5"
                  >
                    {STAGE_LABELS[deal.stage]} ({(STAGE_PROBABILITY[deal.stage] * 100).toFixed(0)}%)
                  </Badge>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs px-2.5 py-0.5 gap-1 font-normal">
                      <AlertTriangle className="h-3 w-3" />
                      {daysOverdue} days overdue
                    </Badge>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-[#5f5f5d] flex-wrap">
                  {deal.company && (
                    <Link
                      to={`/companies/${deal.company.id}`}
                      className="inline-flex items-center gap-1.5 text-[#1c1c1c] font-medium hover:underline"
                    >
                      <Building2 className="h-3.5 w-3.5 text-[#5f5f5d]" />
                      <span>{deal.company.name}</span>
                    </Link>
                  )}
                  <div className="flex items-center gap-1">
                    <UserIcon className="h-3.5 w-3.5" />
                    <span>Owner: {deal.owner?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Target Close: {formatDate(deal.expectedCloseDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Value Metrics */}
            <div className="flex items-center gap-6 bg-[#f7f4ed] p-3 rounded-[8px] border border-[#eceae4] self-start">
              <div>
                <p className="text-[0.6875rem] text-[#5f5f5d] uppercase tracking-wider font-medium">Deal Value</p>
                <p className="text-lg font-bold text-[#1c1c1c]">{formatCurrency(Number(deal.value))}</p>
              </div>
              <div className="h-8 w-px bg-[#eceae4]" />
              <div>
                <p className="text-[0.6875rem] text-[#5f5f5d] uppercase tracking-wider font-medium">Weighted Value</p>
                <p className="text-lg font-bold text-[#1c1c1c]">{formatCurrency(Number(deal.weightedValue))}</p>
              </div>
            </div>
          </div>

          {/* Visual Lifecycle Stepper */}
          <div className="pt-2 border-t border-[#eceae4]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5f5f5d]">
                Lifecycle Progress
              </span>
              {isClosed && isManager && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReopenOpen(true)}
                  disabled={reopenDealMutation.isPending}
                  className="h-7 text-xs gap-1 border-[#eceae4]"
                >
                  {reopenDealMutation.isPending ? (
                    <>
                      <span className="inline-block h-3 w-3 rounded-full border-2 border-[#1c1c1c] border-t-transparent animate-spin mr-1" />
                      <span>Reopening...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3 w-3" />
                      <span>Reopen Deal</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Stepper Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {STAGE_ORDER.map((stage, idx) => {
                const isCurrent = deal.stage === stage;
                const isPassed = !isClosed && currentStageIndex > idx;
                const isWon = deal.stage === 'WON' && stage === 'WON';
                const isLost = deal.stage === 'LOST' && stage === 'LOST';

                let bgClass = 'bg-[#f7f4ed] border-[#eceae4] text-[#5f5f5d]';
                if (isCurrent) {
                  bgClass = 'bg-[#1c1c1c] border-[#1c1c1c] text-[#fcfbf8] shadow-button-inset';
                } else if (isPassed) {
                  bgClass = 'bg-[#eceae4] border-[#eceae4] text-[#1c1c1c]';
                } else if (isWon) {
                  bgClass = 'bg-emerald-700 border-emerald-700 text-white';
                } else if (isLost) {
                  bgClass = 'bg-rose-700 border-rose-700 text-white';
                }

                return (
                  <div
                    key={stage}
                    className={`flex flex-col p-2.5 rounded-[8px] border text-xs transition-all ${bgClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{STAGE_LABELS[stage]}</span>
                      {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                    </div>
                    <span className="text-[0.6875rem] opacity-80 mt-1">
                      {(STAGE_PROBABILITY[stage] * 100).toFixed(0)}% probability
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Stage Transition Control Buttons */}
            {!isClosed && (
              <div className="mt-4 flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-[#eceae4]/70">
                <div className="flex items-center gap-2">
                  {currentStageIndex > 0 && currentStageIndex <= 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isTransitioning}
                      onClick={() => openBackwardModal(STAGE_ORDER[currentStageIndex - 1])}
                      className="text-xs border-[#eceae4] text-amber-800 hover:bg-amber-50"
                    >
                      {isTransitioning && targetStage === STAGE_ORDER[currentStageIndex - 1] ? (
                        <>
                          <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-amber-800 border-t-transparent animate-spin mr-1.5" />
                          <span>Moving Back...</span>
                        </>
                      ) : (
                        <span>Move Back to {STAGE_LABELS[STAGE_ORDER[currentStageIndex - 1]]}</span>
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {deal.stage === 'NEGOTIATION' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isTransitioning}
                        onClick={openLostModal}
                        className="text-xs text-rose-700 hover:bg-rose-50 border-[#eceae4]"
                      >
                        {isTransitioning && targetStage === 'LOST' ? (
                          <>
                            <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-rose-700 border-t-transparent animate-spin mr-1.5" />
                            <span>Marking Lost...</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            <span>Mark Lost</span>
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isTransitioning}
                        onClick={() => handleAdvanceStage('WON')}
                        className="text-xs text-emerald-700 hover:bg-emerald-50 border-[#eceae4]"
                      >
                        {isTransitioning && targetStage === 'WON' ? (
                          <>
                            <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin mr-1.5" />
                            <span>Marking Won...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            <span>Mark Won</span>
                          </>
                        )}
                      </Button>
                    </>
                  ) : nextStage ? (
                    <Button
                      size="sm"
                      onClick={() => handleAdvanceStage(nextStage)}
                      disabled={isTransitioning}
                      className="text-xs bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset gap-1.5"
                    >
                      {isTransitioning && targetStage === nextStage ? (
                        <>
                          <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-[#fcfbf8] border-t-transparent animate-spin" />
                          <span>Advancing to {STAGE_LABELS[nextStage]}...</span>
                        </>
                      ) : (
                        <>
                          <span>Advance to {STAGE_LABELS[nextStage]}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            )}

            {/* Closed Deal Reopen Action (Manager Only) */}
            {isClosed && isManager && (
              <div className="mt-4 flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-[#eceae4]/70">
                <div className="text-xs text-[#5f5f5d]">
                  This deal is closed (<strong className="text-[#1c1c1c]">{STAGE_LABELS[deal.stage]}</strong>). As a sales manager, you can reopen it to return to its previous active stage.
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsReopenOpen(true)}
                  disabled={reopenDealMutation.isPending}
                  className="text-xs bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset gap-1.5"
                >
                  {reopenDealMutation.isPending ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-[#fcfbf8] border-t-transparent animate-spin" />
                      <span>Reopening Deal...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reopen Deal</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            Tasks & Follow-ups ({openDealTasks.length})
          </TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="collaborators">
            Collaborators ({collaborators.length})
          </TabsTrigger>
          <TabsTrigger value="history">Timeline History</TabsTrigger>
          <TabsTrigger value="company">Company Deals ({otherCompanyDeals.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview">
          <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
            <CardHeader className="pb-3 border-b border-[#eceae4]/70">
              <CardTitle className="text-base font-semibold text-[#1c1c1c]">Deal Properties</CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-medium text-[#5f5f5d]">Opportunity Name</p>
                <p className="text-sm font-semibold text-[#1c1c1c] mt-1">{deal.title}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#5f5f5d]">Company</p>
                <Link
                  to={`/companies/${deal.companyId}`}
                  className="text-sm font-semibold text-[#1c1c1c] mt-1 hover:underline inline-block"
                >
                  {deal.company?.name || 'Unassigned'}
                </Link>
              </div>
              <div>
                <p className="text-xs font-medium text-[#5f5f5d]">Deal Value</p>
                <p className="text-sm font-semibold text-[#1c1c1c] mt-1">{formatCurrency(Number(deal.value))}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#5f5f5d]">Current Stage</p>
                <p className="text-sm font-semibold text-[#1c1c1c] mt-1">{STAGE_LABELS[deal.stage]}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#5f5f5d]">Expected Close Date</p>
                <p className="text-sm font-semibold text-[#1c1c1c] mt-1">{formatDate(deal.expectedCloseDate)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#5f5f5d]">Account Owner</p>
                <div className="mt-1">
                  <p className="text-sm font-semibold text-[#1c1c1c] leading-tight">{deal.owner?.name || 'Unassigned'}</p>
                  {deal.owner?.email && (
                    <p className="text-xs text-[#5f5f5d] font-normal mt-0.5">{deal.owner.email}</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[#5f5f5d]">Created At</p>
                <p className="text-xs text-[#5f5f5d] mt-1">{formatDate(deal.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#5f5f5d]">Last Modified</p>
                <p className="text-xs text-[#5f5f5d] mt-1">{formatDate(deal.updatedAt)}</p>
              </div>
              {deal.closedAt && (
                <div>
                  <p className="text-xs font-medium text-[#5f5f5d]">Closed On</p>
                  <p className="text-xs text-[#5f5f5d] mt-1">{formatDate(deal.closedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Notes */}
        <TabsContent value="notes">
          <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
            <CardHeader className="pb-3 border-b border-[#eceae4]/70">
              <CardTitle className="text-base font-semibold text-[#1c1c1c] flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Deal Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-3">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add meeting notes, next steps, or customer feedback..."
                  className="bg-[#f7f4ed]"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newNote.trim() || addNoteMutation.isPending}
                    className="bg-[#1c1c1c] text-[#fcfbf8] text-xs gap-1.5 shadow-button-inset"
                  >
                    {addNoteMutation.isPending ? (
                      <>
                        <FiLoader className="h-3.5 w-3.5 animate-spin text-[#fcfbf8]" />
                        <span>Posting Note...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Post Note</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Notes List extracted from history events */}
              <div className="space-y-3 pt-3 border-t border-[#eceae4]">
                {historyEvents.filter((e) => e.type === 'NOTE_ADDED' && e.note).length === 0 ? (
                  <p className="text-xs text-[#5f5f5d] text-center py-6">No notes added to this deal yet.</p>
                ) : (
                  historyEvents
                    .filter((e) => e.type === 'NOTE_ADDED' && e.note)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[8px] border border-[#eceae4] bg-[#f7f4ed]/50 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#1c1c1c]">
                            {item.actor?.name || 'Team Member'}
                          </span>
                          <span className="text-[0.6875rem] text-[#5f5f5d]">{formatDate(item.createdAt)}</span>
                        </div>
                        <p className="text-xs text-[#1c1c1c] whitespace-pre-wrap leading-relaxed">
                          {item.note}
                        </p>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Collaborators */}
        <TabsContent value="collaborators">
          <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
            <CardHeader className="pb-3 border-b border-[#eceae4]/70 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-[#1c1c1c] flex items-center gap-2">
                <Users className="h-4 w-4" /> Deal Collaborators
              </CardTitle>
              {(isManager || deal.ownerId === user?.id) && (
                <Button
                  size="sm"
                  onClick={() => setIsAddCollaboratorOpen(true)}
                  className="text-xs bg-[#1c1c1c] text-[#fcfbf8] gap-1 shadow-button-inset"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add Collaborator
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {isCollabLoading ? (
                <div className="p-6 space-y-2">
                  <Skeleton className="h-12 w-full bg-[#eceae4]" />
                </div>
              ) : collaborators.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="mx-auto h-8 w-8 text-[#5f5f5d]/40" />
                  <p className="mt-2 text-sm font-medium text-[#1c1c1c]">No collaborators assigned</p>
                  <p className="text-xs text-[#5f5f5d]">Assign team members to collaborate on this deal.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#eceae4]/70">
                  {collaborators.map((collab) => (
                    <div
                      key={collab.userId}
                      className="flex items-center justify-between p-4 hover:bg-[rgba(28,28,28,0.02)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          fallback={collab.user.name.slice(0, 2).toUpperCase()}
                          className="h-8 w-8 text-xs bg-[#eceae4]"
                        />
                        <div>
                          <p className="text-xs font-semibold text-[#1c1c1c]">{collab.user.name}</p>
                          <p className="text-[0.6875rem] text-[#5f5f5d]">{collab.user.email}</p>
                        </div>
                      </div>

                      {(isManager || deal.ownerId === user?.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCollaborator(collab.userId)}
                          className="text-xs text-destructive hover:bg-destructive/10"
                        >
                          <UserMinus className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Timeline History */}
        <TabsContent value="history">
          <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
            <CardHeader className="pb-3 border-b border-[#eceae4]/70">
              <CardTitle className="text-base font-semibold text-[#1c1c1c] flex items-center gap-2">
                <History className="h-4 w-4" /> Immutable Audit Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isHistoryLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full bg-[#eceae4]" />
                  <Skeleton className="h-10 w-full bg-[#eceae4]" />
                </div>
              ) : historyEvents.length === 0 ? (
                <p className="text-xs text-[#5f5f5d] text-center py-6">No history records found.</p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#eceae4]">
                  {historyEvents.map((evt) => (
                    <div key={evt.id} className="relative group">
                      <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-[#fcfbf8] bg-[#1c1c1c]" />
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-[#1c1c1c]">{evt.actor?.name || 'System'}</span>
                          <Badge variant="outline" className="text-[0.625rem] px-1.5 py-0 h-4">
                            {evt.type}
                          </Badge>
                          <span className="text-[0.6875rem] text-[#5f5f5d] ml-auto">
                            {formatDate(evt.createdAt)}
                          </span>
                        </div>

                        {evt.type === 'REOPENED' && evt.newStage && (
                          <p className="text-xs text-[#1c1c1c]">
                            Deal <strong className="text-amber-800 font-semibold">REOPENED</strong> and returned to stage{' '}
                            <strong className="text-[#1c1c1c]">{STAGE_LABELS[evt.newStage]}</strong>
                            {evt.oldStage && <span className="text-[#5f5f5d]"> (was {STAGE_LABELS[evt.oldStage]})</span>}
                          </p>
                        )}

                        {evt.type === 'STAGE_CHANGED' && evt.oldStage && evt.newStage && (
                          <div>
                            {evt.newStage === 'WON' ? (
                              <p className="text-xs text-emerald-800 font-medium">
                                Deal marked as <strong>WON</strong> from {STAGE_LABELS[evt.oldStage]}
                              </p>
                            ) : evt.newStage === 'LOST' ? (
                              <p className="text-xs text-rose-800 font-medium">
                                Deal marked as <strong>LOST</strong> from {STAGE_LABELS[evt.oldStage]}
                              </p>
                            ) : (
                              <p className="text-xs text-[#5f5f5d]">
                                Stage transition: <strong className="text-[#1c1c1c]">{STAGE_LABELS[evt.oldStage]}</strong> →{' '}
                                <strong className="text-[#1c1c1c]">{STAGE_LABELS[evt.newStage]}</strong>
                              </p>
                            )}
                          </div>
                        )}

                        {evt.type === 'CREATED' && (
                          <p className="text-xs text-[#5f5f5d]">Deal created at stage <strong>New</strong></p>
                        )}

                        {evt.type === 'OWNER_CHANGED' && (
                          <p className="text-xs text-[#5f5f5d]">
                            Deal owner reassigned
                            {evt.oldOwner && evt.newOwner && (
                              <span> from <strong>{evt.oldOwner.name}</strong> to <strong>{evt.newOwner.name}</strong></span>
                            )}
                          </p>
                        )}

                        {evt.type === 'COLLABORATOR_ADDED' && (
                          <p className="text-xs text-[#5f5f5d]">
                            Collaborator added: <strong>{evt.collaborator?.name || 'Team member'}</strong>
                          </p>
                        )}

                        {evt.type === 'COLLABORATOR_REMOVED' && (
                          <p className="text-xs text-[#5f5f5d]">
                            Collaborator removed: <strong>{evt.collaborator?.name || 'Team member'}</strong>
                          </p>
                        )}

                        {evt.type === 'DELETED' && (
                          <p className="text-xs text-rose-700 font-medium">Deal moved to trash</p>
                        )}

                        {evt.reason && (
                          <div className="rounded-[4px] bg-[#eceae4]/60 p-2 text-xs text-[#1c1c1c] border border-[#eceae4]">
                            <strong>Reason:</strong> {evt.reason}
                          </div>
                        )}

                        {evt.note && (
                          <p className="text-xs text-[#1c1c1c] bg-[#eceae4]/30 p-2 rounded-[4px]">
                            {evt.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Tasks & Follow-ups */}
        <TabsContent value="tasks">
          <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
            <CardHeader className="pb-3 border-b border-[#eceae4]/70 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-[#1c1c1c] flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" /> Deal Tasks & Follow-ups
                </CardTitle>
                <p className="text-xs text-[#5f5f5d] mt-1">
                  Action items and scheduled follow-ups for this opportunity.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingTask(null);
                  setIsCreateTaskOpen(true);
                }}
                className="text-xs bg-[#1c1c1c] text-[#fcfbf8] gap-1 shadow-button-inset"
              >
                <Plus className="h-3.5 w-3.5" /> Add Task
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {isTasksLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full bg-[#eceae4]" />
                  <Skeleton className="h-20 w-full bg-[#eceae4]" />
                </div>
              ) : dealTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckSquare className="mx-auto h-8 w-8 text-[#5f5f5d]/40" />
                  <p className="mt-2 text-sm font-medium text-[#1c1c1c]">No tasks or follow-ups yet</p>
                  <p className="text-xs text-[#5f5f5d] mt-0.5">Create a task to maintain momentum on this deal.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTask(null);
                      setIsCreateTaskOpen(true);
                    }}
                    className="mt-4 text-xs gap-1.5 border-[#eceae4]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add First Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Open Tasks Section */}
                  {openDealTasks.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5f5f5d]">
                        Open Tasks ({openDealTasks.length})
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {openDealTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            hideDealLink
                            onEdit={(t) => {
                              setEditingTask(t);
                              setIsCreateTaskOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Tasks Section */}
                  {completedDealTasks.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-[#eceae4]/70">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5f5f5d]">
                        Completed Tasks ({completedDealTasks.length})
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {completedDealTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            hideDealLink
                            onEdit={(t) => {
                              setEditingTask(t);
                              setIsCreateTaskOpen(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Company Deals */}
        <TabsContent value="company">
          <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
            <CardHeader className="pb-3 border-b border-[#eceae4]/70">
              <CardTitle className="text-base font-semibold text-[#1c1c1c] flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Other Deals at {deal.company?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {otherCompanyDeals.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5f5f5d]">
                  No other deals exist for this company.
                </div>
              ) : (
                <div className="divide-y divide-[#eceae4]/70">
                  {otherCompanyDeals.map((d) => (
                    <Link
                      key={d.id}
                      to={`/deals/${d.id}`}
                      className="flex items-center justify-between p-4 hover:bg-[rgba(28,28,28,0.02)] transition-colors group"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#1c1c1c] group-hover:underline">{d.title}</p>
                        <p className="text-[0.6875rem] text-[#5f5f5d]">
                          {STAGE_LABELS[d.stage]} • Target: {formatDate(d.expectedCloseDate)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[#1c1c1c]">
                        {formatCurrency(Number(d.value))}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Deal Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
            <DialogDescription>Update deal opportunity information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="editDealTitle">Title *</Label>
              <Input
                id="editDealTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editDealValue">Deal Value (₹ INR) *</Label>
              <Input
                id="editDealValue"
                type="number"
                step="0.01"
                min="1"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editDealDate">Expected Close Date *</Label>
              <DatePicker
                id="editDealDate"
                value={editDate}
                onChange={setEditDate}
                required
              />
            </div>
            {isManager && (
              <div className="space-y-1.5">
                <Label htmlFor="editDealOwner">Reassign Owner</Label>
                <UserSelector
                  id="editDealOwner"
                  value={editOwnerId}
                  onChange={setEditOwnerId}
                  allowedRoles={['SALES_REP']}
                  placeholder="Select new sales rep..."
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateDealMutation.isPending}
                className="bg-[#1c1c1c] text-[#fcfbf8]"
              >
                {updateDealMutation.isPending ? (
                  <>
                    <FiLoader className="h-3.5 w-3.5 mr-1.5 animate-spin text-[#fcfbf8]" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Backward Stage Transition Reason Dialog */}
      <Dialog open={isBackwardOpen} onOpenChange={setIsBackwardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Deal Backward to {STAGE_LABELS[targetBackwardStage]}</DialogTitle>
            <DialogDescription>
              A justification reason is required when regressing a deal to a previous pipeline stage.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBackwardSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="backwardReason">Reason for Stage Regression *</Label>
              <Textarea
                id="backwardReason"
                value={backwardReason}
                onChange={(e) => setBackwardReason(e.target.value)}
                placeholder="e.g. Prospect requested revised scope and re-qualification after internal review."
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBackwardOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!backwardReason.trim() || transitionStageMutation.isPending}
                className="bg-amber-800 text-white"
              >
                {transitionStageMutation.isPending ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin mr-1.5" />
                    <span>Regressing Stage...</span>
                  </>
                ) : (
                  'Confirm Stage Regression'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark Deal as Lost Dialog */}
      <Dialog open={isLostOpen} onOpenChange={setIsLostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Deal as Lost</DialogTitle>
            <DialogDescription>
              Record the outcome and reason for marking this opportunity as lost.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLostSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lostReason">Reason *</Label>
              <Textarea
                id="lostReason"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Why was this deal lost?"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsLostOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!lostReason.trim() || transitionStageMutation.isPending}
                className="bg-rose-700 text-white hover:bg-rose-800"
              >
                {transitionStageMutation.isPending ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin mr-1.5" />
                    <span>Marking Lost...</span>
                  </>
                ) : (
                  'Mark Lost'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reopen Closed Deal Confirmation */}
      <AlertDialog
        open={isReopenOpen}
        onOpenChange={setIsReopenOpen}
        title="Reopen Deal?"
        description="This will restore the deal to its previous active pipeline stage."
        confirmText="Reopen Deal"
        isLoading={reopenDealMutation.isPending}
        onConfirm={handleReopenConfirm}
      />

      {/* Delete Deal Confirmation */}
      <AlertDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Deal?"
        description="This deal will be moved to the trash archive."
        confirmText="Delete Deal"
        variant="destructive"
        isLoading={deleteDealMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />

      {/* Add Collaborator Dialog */}
      <Dialog open={isAddCollaboratorOpen} onOpenChange={setIsAddCollaboratorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Collaborator</DialogTitle>
            <DialogDescription>Select a team member to collaborate on this deal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCollaborator} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="collabUserId">Select Collaborator *</Label>
              <UserSelector
                id="collabUserId"
                value={collaboratorUserId}
                onChange={setCollaboratorUserId}
                allowedRoles={['SALES_REP']}
                excludeUserIds={deal ? [deal.ownerId, ...collaborators.map((c) => c.userId)] : []}
                placeholder="Select sales rep to collaborate..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCollaboratorOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!collaboratorUserId.trim() || addCollaboratorMutation.isPending}
                className="bg-[#1c1c1c] text-[#fcfbf8]"
              >
                {addCollaboratorMutation.isPending ? (
                  <>
                    <FiLoader className="h-3.5 w-3.5 mr-1.5 animate-spin text-[#fcfbf8]" />
                    <span>Adding Collaborator...</span>
                  </>
                ) : (
                  'Add Collaborator'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Add / Edit Task Dialog */}
      <TaskFormDialog
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        task={editingTask || undefined}
        dealId={deal.id}
      />
    </div>
  );
}
