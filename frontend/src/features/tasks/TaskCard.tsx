import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCheck,
  FiMoreVertical,
  FiEdit2,
  FiRotateCcw,
  FiTrash2,
  FiCalendar,
  FiBriefcase,
  FiCheckCircle,
} from 'react-icons/fi';
import { Task } from './tasks.types';
import { useCompleteTask, useReopenTask, useDeleteTask } from './useTasks';
import { useAuth } from '@/features/auth/AuthContext';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn, formatDate } from '@/lib/utils';
import { CompleteTaskDialog } from './CompleteTaskDialog';
import { TaskFormDialog } from './TaskFormDialog';

interface TaskCardProps {
  task: Task;
  perspective?: 'assigned_to_me' | 'assigned_by_me' | 'team' | 'mine';
  onEdit?: (task: Task) => void;
  showDealContext?: boolean;
  hideDealLink?: boolean;
}

export function TaskCard({
  task,
  perspective: _perspective = 'assigned_to_me',
  onEdit,
  showDealContext = true,
  hideDealLink = false,
}: TaskCardProps) {
  const { user, isManager } = useAuth();
  const completeTaskMutation = useCompleteTask();
  const reopenTaskMutation = useReopenTask();
  const deleteTaskMutation = useDeleteTask();

  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const isGloballyCompleted = Boolean(task.completedAt);

  // Determine assignees list
  const assignees = task.assignees && task.assignees.length > 0
    ? task.assignees
    : task.assignedTo
    ? [{
        id: 'legacy',
        userId: task.assignedToId || '',
        assignedAt: task.createdAt,
        completedAt: task.completedAt,
        completionNote: null,
        user: task.assignedTo,
      }]
    : [];

  const totalAssignees = assignees.length || 1;
  const completedCount = assignees.filter((a) => Boolean(a.completedAt)).length;

  // Check current user's individual assignment
  const currentUserAssignee = assignees.find((a) => a.userId === user?.id);
  const isUserAssigned = Boolean(currentUserAssignee);
  const isUserCompleted = Boolean(currentUserAssignee?.completedAt);

  // Calendar due date calculation
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueStr = task.dueDate ? task.dueDate.slice(0, 10) : '';
  const isDueToday = dueStr === todayStr && !isGloballyCompleted;
  const isOverdue = dueStr < todayStr && !isGloballyCompleted;

  const getOverdueDays = () => {
    const today = new Date(todayStr);
    const due = new Date(dueStr);
    const diffTime = today.getTime() - due.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const overdueDays = isOverdue ? getOverdueDays() : 0;

  // Permissions
  const canEdit =
    isManager ||
    task.createdById === user?.id ||
    isUserAssigned;

  const canDelete =
    isManager ||
    task.createdById === user?.id;

  const handleQuickToggle = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!isUserAssigned) {
      toast.info('Only assigned team members can complete their assignment.');
      return;
    }

    if (isUserCompleted) {
      // Reopen user's assignment
      try {
        await reopenTaskMutation.mutateAsync(task.id);
        toast.success('Your assignment has been reopened');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to reopen task');
      }
    } else {
      // Quick complete user's assignment without note
      try {
        await completeTaskMutation.mutateAsync({ id: task.id });
        toast.success('Your assignment marked as completed');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to complete task');
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    try {
      await deleteTaskMutation.mutateAsync(task.id);
      toast.success('Task deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  return (
    <>
      <div
        className={cn(
          'group relative flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-3.5 rounded-lg border transition-all duration-150',
          isGloballyCompleted
            ? 'bg-[#faf9f5] border-[#eceae4]/80 opacity-80'
            : isOverdue
            ? 'bg-white border-rose-200 shadow-2xs hover:border-rose-300'
            : isDueToday
            ? 'bg-white border-amber-200 shadow-2xs hover:border-amber-300'
            : 'bg-white border-[#eceae4] shadow-2xs hover:border-[#1c1c1c]/25'
        )}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Completion Checkbox Circle (Toggles current user's assignment) */}
          <button
            type="button"
            onClick={handleQuickToggle}
            disabled={!isUserAssigned || completeTaskMutation.isPending || reopenTaskMutation.isPending}
            aria-label={
              isUserAssigned
                ? isUserCompleted
                  ? 'Reopen your assignment'
                  : 'Complete your assignment'
                : 'Task completion status'
            }
            title={
              isUserAssigned
                ? isUserCompleted
                  ? 'Click to reopen your assignment'
                  : 'Click to mark your assignment complete'
                : 'Only assigned members can complete'
            }
            className={cn(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all',
              isUserAssigned ? 'cursor-pointer' : 'cursor-default opacity-80',
              isGloballyCompleted || isUserCompleted
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-[#cfccc4] bg-white hover:border-emerald-600 hover:bg-emerald-50 text-transparent hover:text-emerald-600'
            )}
          >
            <FiCheck className="h-3 w-3 stroke-[3]" />
          </button>

          {/* Task Info & Hierarchy */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Title & Priority */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Priority Indicator Pill */}
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] border shrink-0',
                  task.priority === 'HIGH'
                    ? 'text-rose-700 bg-rose-50 border-rose-200/80'
                    : task.priority === 'MEDIUM'
                    ? 'text-amber-700 bg-amber-50 border-amber-200/80'
                    : 'text-slate-600 bg-slate-50 border-slate-200/80'
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0',
                    task.priority === 'HIGH'
                      ? 'bg-rose-600'
                      : task.priority === 'MEDIUM'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  )}
                />
                {task.priority}
              </span>

              <span
                className={cn(
                  'text-xs font-semibold text-[#1c1c1c] leading-tight break-words',
                  isGloballyCompleted && 'line-through text-[#8e8d8a]'
                )}
              >
                {task.title}
              </span>
            </div>

            {/* Deal & Company Breadcrumb */}
            {showDealContext && !hideDealLink && task.deal && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#5f5f5d] truncate">
                <FiBriefcase className="h-3 w-3 shrink-0 text-[#8e8d8a]" />
                <Link
                  to={`/deals/${task.dealId}`}
                  className="hover:text-[#1c1c1c] hover:underline truncate font-medium"
                >
                  {task.deal.title}
                </Link>
                {task.company?.name && (
                  <>
                    <span className="text-[#cfccc4]">•</span>
                    <span className="text-[#8e8d8a] truncate">{task.company.name}</span>
                  </>
                )}
              </div>
            )}

            {/* Description if present */}
            {task.description && (
              <p className="text-[11px] text-[#5f5f5d] line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Multi-Assignee Read-Only Status & Progress Pill */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-[11px] text-[#8e8d8a]">Assigned to:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {assignees.map((a) => {
                  const isDone = Boolean(a.completedAt);
                  const isCurrentUser = a.userId === user?.id;
                  const initials = a.user?.name
                    ? a.user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                    : 'U';

                  const tooltipText = isDone
                    ? `${a.user?.name || 'User'} completed${a.completionNote ? `: "${a.completionNote}"` : ''}`
                    : `${a.user?.name || 'User'} (Pending)`;

                  return (
                    <Tooltip key={a.id || a.userId} content={tooltipText} side="top">
                      <div
                        className={cn(
                          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border font-medium transition-colors',
                          isDone
                            ? 'bg-emerald-50/80 border-emerald-200/70 text-emerald-800'
                            : 'bg-[#faf9f5] border-[#eceae4] text-[#1c1c1c]'
                        )}
                      >
                        <Avatar
                          fallback={initials}
                          className={cn(
                            'h-3.5 w-3.5 text-[8px] font-bold',
                            isDone ? 'bg-emerald-600 text-white' : 'bg-[#eceae4] text-[#1c1c1c]'
                          )}
                        />
                        <span className="truncate max-w-[110px]">
                          {a.user?.name || 'User'}
                          {isCurrentUser && ' (You)'}
                        </span>
                        {isDone ? (
                          <FiCheck className="h-3 w-3 stroke-[3] text-emerald-600 shrink-0" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        )}
                      </div>
                    </Tooltip>
                  );
                })}
              </div>

              {/* Progress Count Indicator */}
              <span className="inline-flex items-center text-[10px] text-[#5f5f5d] font-semibold bg-[#eceae4]/70 px-1.5 py-0.5 rounded border border-[#eceae4]">
                {completedCount} / {totalAssignees} completed
              </span>
            </div>

            {/* Due Date Indicator */}
            <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-[#5f5f5d]">
              <FiCalendar className="h-3 w-3 shrink-0 text-[#8e8d8a]" />
              {isGloballyCompleted ? (
                <span className="text-emerald-700 font-medium">
                  Completed {formatDate(task.completedAt!)}
                </span>
              ) : isDueToday ? (
                <span className="text-amber-700 font-semibold">Due today</span>
              ) : isOverdue ? (
                <span className="text-rose-700 font-semibold">
                  {overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`}
                </span>
              ) : (
                <span>Due {formatDate(task.dueDate)}</span>
              )}
              {task.createdBy?.name && (
                <>
                  <span className="text-[#cfccc4]">•</span>
                  <span className="text-[#8e8d8a]">Created by {task.createdBy.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end sm:justify-start gap-1.5 shrink-0 self-end sm:self-center">
          {isUserAssigned && !isUserCompleted && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCompleteDialogOpen(true)}
              className="h-7 text-[11px] px-2.5 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-[#1c1c1c] border-[#eceae4] gap-1 shadow-2xs"
            >
              <FiCheckCircle className="h-3 w-3 text-emerald-600" />
              Complete
            </Button>
          )}

          {isUserAssigned && isUserCompleted && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleQuickToggle}
              className="h-7 text-[11px] px-2.5 bg-white hover:bg-[#eceae4] text-[#5f5f5d] border-[#eceae4] gap-1 shadow-2xs"
            >
              <FiRotateCcw className="h-3 w-3" />
              Reopen
            </Button>
          )}

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Task options"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[#eceae4] bg-white text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c] transition-colors cursor-pointer shadow-2xs"
                >
                  <FiMoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-white border-[#eceae4] p-1 shadow-focus-soft">
                <DropdownMenuItem
                  onClick={() => {
                    if (onEdit) {
                      onEdit(task);
                    } else {
                      setIsEditDialogOpen(true);
                    }
                  }}
                  className="text-xs text-[#1c1c1c] cursor-pointer gap-2 py-1.5"
                >
                  <FiEdit2 className="h-3.5 w-3.5 text-[#5f5f5d]" />
                  Edit Task
                </DropdownMenuItem>

                {isUserAssigned && !isUserCompleted && (
                  <DropdownMenuItem
                    onClick={() => setIsCompleteDialogOpen(true)}
                    className="text-xs text-emerald-700 cursor-pointer gap-2 py-1.5"
                  >
                    <FiCheck className="h-3.5 w-3.5" />
                    Complete with Note
                  </DropdownMenuItem>
                )}

                {isUserAssigned && isUserCompleted && (
                  <DropdownMenuItem
                    onClick={() => handleQuickToggle()}
                    className="text-xs text-[#1c1c1c] cursor-pointer gap-2 py-1.5"
                  >
                    <FiRotateCcw className="h-3.5 w-3.5 text-[#5f5f5d]" />
                    Reopen My Work
                  </DropdownMenuItem>
                )}

                {canDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-xs text-rose-600 cursor-pointer gap-2 py-1.5 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                    Delete Task
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Completion Dialog with Optional Note */}
      <CompleteTaskDialog
        isOpen={isCompleteDialogOpen}
        onClose={() => setIsCompleteDialogOpen(false)}
        task={task}
      />

      {/* Edit Task Dialog */}
      <TaskFormDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        task={task}
        dealId={task.dealId}
      />
    </>
  );
}
