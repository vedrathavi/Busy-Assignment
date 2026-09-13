import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiPlus,
  FiCheckSquare,
  FiCheckCircle,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { useAuth } from '@/features/auth/AuthContext';
import { useTasks } from '@/features/tasks/useTasks';
import { TaskListQuery } from '@/features/tasks/tasks.types';
import { TaskCard } from '@/features/tasks/TaskCard';
import { TaskFilters } from '@/features/tasks/TaskFilters';
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  PageHeader,
  PageHeaderHeading,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from '@/components/ui/page-header';

export function TasksPage() {
  const { isManager } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Parse filters from URL search params
  const rawScope = searchParams.get('scope');
  const scope = (rawScope === 'assigned_by_me' || rawScope === 'team') ? rawScope : 'assigned_to_me';
  const status = (searchParams.get('status') as 'all' | 'open' | 'completed') || 'all';
  const time = (searchParams.get('time') as 'all' | 'today' | 'upcoming' | 'overdue') || 'all';
  const priority = (searchParams.get('priority') as 'all' | 'low' | 'medium' | 'high') || 'all';
  const assignedToId = searchParams.get('assignedToId') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 20;

  const filters: TaskListQuery = {
    scope,
    status,
    time,
    priority,
    assignedToId,
    page,
    limit,
  };

  const handleFiltersChange = (newFilters: TaskListQuery) => {
    const nextParams = new URLSearchParams();
    if (newFilters.scope && newFilters.scope !== 'assigned_to_me' && newFilters.scope !== 'mine') {
      nextParams.set('scope', newFilters.scope);
    }
    if (newFilters.status && newFilters.status !== 'all') {
      nextParams.set('status', newFilters.status);
    }
    if (newFilters.time && newFilters.time !== 'all') {
      nextParams.set('time', newFilters.time);
    }
    if (newFilters.priority && newFilters.priority !== 'all') {
      nextParams.set('priority', newFilters.priority);
    }
    if (newFilters.assignedToId) {
      nextParams.set('assignedToId', newFilters.assignedToId);
    }
    if (newFilters.page && newFilters.page > 1) {
      nextParams.set('page', newFilters.page.toString());
    }
    setSearchParams(nextParams);
  };

  const { data, isLoading, isFetching, error } = useTasks(filters);
  const isBusy = isLoading || isFetching;
  const tasks = data?.tasks || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader>
        <PageHeaderHeading>
          <div className="flex flex-wrap items-center gap-2.5">
            <PageHeaderTitle>Tasks & Follow-ups</PageHeaderTitle>
            {summary && (
              <div className="flex items-center gap-1.5 ml-1">
                <span className="inline-flex items-center rounded-full bg-[#eceae4] px-2.5 py-0.5 text-xs font-medium text-[#1c1c1c]">
                  {summary.open} Open
                </span>
                {summary.dueToday > 0 && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    {summary.dueToday} Due Today
                  </span>
                )}
                {summary.overdue > 0 && (
                  <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                    {summary.overdue} Overdue
                  </span>
                )}
              </div>
            )}
          </div>
          <PageHeaderDescription>
            Stay on top of the work that moves your deals forward.
          </PageHeaderDescription>
        </PageHeaderHeading>

        <PageHeaderActions>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset gap-1.5"
          >
            <FiPlus className="h-4 w-4" />
            <span>Add Task</span>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {/* Perspective Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#eceae4] px-1 -mb-2">
        <button
          type="button"
          onClick={() => handleFiltersChange({ ...filters, scope: 'assigned_to_me', page: 1 })}
          className={cn(
            'flex items-center gap-1.5 pb-3 px-2 text-sm font-semibold transition-all cursor-pointer border-b-2',
            scope === 'assigned_to_me'
              ? 'border-[#1c1c1c] text-[#1c1c1c]'
              : 'border-transparent text-[#5f5f5d] hover:text-[#1c1c1c]'
          )}
        >
          <span>Assigned to me</span>
        </button>
        <button
          type="button"
          onClick={() => handleFiltersChange({ ...filters, scope: 'assigned_by_me', page: 1 })}
          className={cn(
            'flex items-center gap-1.5 pb-3 px-2 text-sm font-semibold transition-all cursor-pointer border-b-2',
            scope === 'assigned_by_me'
              ? 'border-[#1c1c1c] text-[#1c1c1c]'
              : 'border-transparent text-[#5f5f5d] hover:text-[#1c1c1c]'
          )}
        >
          <span>Assigned by me</span>
        </button>
        {isManager && (
          <button
            type="button"
            onClick={() => handleFiltersChange({ ...filters, scope: 'team', page: 1 })}
            className={cn(
              'flex items-center gap-1.5 pb-3 px-2 text-sm font-semibold transition-all cursor-pointer border-b-2',
              scope === 'team'
                ? 'border-[#1c1c1c] text-[#1c1c1c]'
                : 'border-transparent text-[#5f5f5d] hover:text-[#1c1c1c]'
            )}
          >
            <span>Team tasks</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="space-y-4 rounded-xl border border-[#eceae4] bg-[#fcfbf8] p-4 sm:p-5 shadow-2xs">
        {/* Filter Toolbar */}
        <TaskFilters filters={filters} onChange={handleFiltersChange} />

        {/* Task List */}
        {isBusy ? (
          <div className="space-y-2.5 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-lg border border-[#eceae4] bg-white p-3.5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center text-xs text-rose-600">
            Failed to load tasks. Please try again.
          </div>
        ) : tasks.length === 0 ? (
          /* Empty States */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f7f4ed] text-[#8e8d8a] mb-3">
              {time === 'overdue' ? (
                <FiCheckCircle className="h-6 w-6 text-emerald-600" />
              ) : time === 'today' ? (
                <FiCalendar className="h-6 w-6 text-[#8e8d8a]" />
              ) : (
                <FiCheckSquare className="h-6 w-6 text-[#8e8d8a]" />
              )}
            </div>
            <h3 className="text-sm font-bold text-[#1c1c1c]">
              {time === 'overdue'
                ? 'No overdue tasks'
                : time === 'today'
                ? 'Nothing due today'
                : status === 'completed'
                ? 'No completed tasks yet'
                : "You're all caught up"}
            </h3>
            <p className="text-xs text-[#5f5f5d] max-w-sm mt-1">
              {time === 'overdue'
                ? 'Everything is on track across your pipeline.'
                : time === 'today'
                ? 'You have no scheduled tasks due today.'
                : status === 'completed'
                ? 'Tasks marked complete will appear here.'
                : 'Tasks and follow-ups for your deals will appear here.'}
            </p>
            {status === 'open' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
                className="mt-4 text-xs bg-white text-[#1c1c1c] border-[#eceae4] gap-1.5"
              >
                <FiPlus className="h-3.5 w-3.5" />
                Create New Task
              </Button>
            )}
          </div>
        ) : (
          /* Task Cards Queue */
          <div className="space-y-2.5">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} perspective={scope} showDealContext={true} />
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#eceae4] pt-3 text-xs text-[#5f5f5d]">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} tasks
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => handleFiltersChange({ ...filters, page: pagination.page - 1 })}
                className="h-7 text-xs px-2.5 bg-white border-[#eceae4]"
              >
                <FiChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <span className="px-2 text-xs font-medium text-[#1c1c1c]">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handleFiltersChange({ ...filters, page: pagination.page + 1 })}
                className="h-7 text-xs px-2.5 bg-white border-[#eceae4]"
              >
                Next
                <FiChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Global Add Task Dialog */}
      <TaskFormDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />
    </div>
  );
}
