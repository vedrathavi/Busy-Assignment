import React, { useState, useEffect } from 'react';
import { Task, TaskPriority } from './tasks.types';
import { useCreateTask, useUpdateTask } from './useTasks';
import { useDeals, useCollaborators, useDealDetail } from '@/features/deals/useDeals';
import { useAuth } from '@/features/auth/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Tooltip } from '@/components/ui/tooltip';
import { Avatar } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  FiLoader,
  FiCalendar,
  FiBriefcase,
  FiUsers,
  FiFlag,
  FiInfo,
  FiLock,
  FiCheck,
} from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task;
  dealId?: string; // Preselected if opened from DealDetailPage
}

export function TaskFormDialog({ isOpen, onClose, task, dealId: propDealId }: TaskFormDialogProps) {
  const { user } = useAuth();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();

  const isEditing = Boolean(task);

  // Form states
  const [selectedDealId, setSelectedDealId] = useState<string>(propDealId || task?.dealId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>('');

  // Fetch list of accessible deals when opened from global page
  const { data: dealsData } = useDeals({
    limit: 100,
  });

  // Fetch active deal detail and collaborators for the selected deal
  const effectiveDealId = selectedDealId || propDealId || task?.dealId;
  const { data: currentDeal } = useDealDetail(effectiveDealId);
  const { data: collaborators = [] } = useCollaborators(effectiveDealId);

  // Compute valid assignees strictly based on the selected deal's participants (Deal Owner + Active Collaborators)
  const getAssignableUsers = () => {
    const selectedDealFromList = dealsData?.deals?.find((d) => d.id === effectiveDealId);
    const dealOwner = currentDeal?.owner || selectedDealFromList?.owner;

    const allowed = new Map<
      string,
      { id: string; name: string; email: string; role?: string; isOwner: boolean; isCollab: boolean }
    >();

    if (dealOwner && dealOwner.id) {
      allowed.set(dealOwner.id, {
        id: dealOwner.id,
        name: dealOwner.name,
        email: dealOwner.email,
        isOwner: true,
        isCollab: false,
      });
    }

    collaborators.forEach((c) => {
      if (c.user && c.userId !== dealOwner?.id) {
        allowed.set(c.userId, {
          id: c.userId,
          name: c.user.name,
          email: c.user.email,
          isOwner: false,
          isCollab: true,
        });
      }
    });

    return Array.from(allowed.values());
  };

  const assignableUsers = getAssignableUsers();

  // Reset or populate fields when opening/closing or task changes
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setSelectedDealId(task.dealId);
        setTitle(task.title);
        setDescription(task.description || '');
        setPriority(task.priority);
        const existingIds = task.assignees && task.assignees.length > 0
          ? task.assignees.map((a) => a.userId)
          : task.assignedToId
          ? [task.assignedToId]
          : [];
        setSelectedAssigneeIds(existingIds);
        setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
      } else {
        setSelectedDealId(propDealId || '');
        setTitle('');
        setDescription('');
        setPriority('MEDIUM');
        // Default assignee to current user if available
        if (user?.id) {
          setSelectedAssigneeIds([user.id]);
        } else if (assignableUsers.length > 0) {
          setSelectedAssigneeIds([assignableUsers[0].id]);
        } else {
          setSelectedAssigneeIds([]);
        }
        // Default due date to today
        const todayStr = new Date().toISOString().slice(0, 10);
        setDueDate(todayStr);
      }
    }
  }, [isOpen, task, propDealId, user]);

  // Keep selectedAssigneeIds valid when selected deal changes during creation
  useEffect(() => {
    if (isOpen && !isEditing && assignableUsers.length > 0) {
      const validIds = selectedAssigneeIds.filter((id) =>
        assignableUsers.some((u) => u.id === id)
      );
      if (validIds.length === 0) {
        const selfUser = assignableUsers.find((u) => u.id === user?.id);
        setSelectedAssigneeIds(selfUser ? [selfUser.id] : [assignableUsers[0].id]);
      }
    }
  }, [isOpen, selectedDealId, assignableUsers, user, isEditing]);

  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) => {
      if (prev.includes(userId)) {
        // Must keep at least one
        if (prev.length === 1) {
          toast.info('At least one assignee must be selected');
          return prev;
        }
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }

    if (!effectiveDealId) {
      toast.error('Please select an associated deal');
      return;
    }

    if (!isEditing) {
      if (selectedAssigneeIds.length === 0) {
        toast.error('Please select at least one assignee');
        return;
      }
      const allowedIds = new Set(assignableUsers.map((u) => u.id));
      const hasInvalid = selectedAssigneeIds.some((id) => !allowedIds.has(id));
      if (hasInvalid) {
        toast.error('One or more selected assignees are not associated with this deal.');
        return;
      }
    }

    if (!dueDate) {
      toast.error('Please select a due date');
      return;
    }

    try {
      if (isEditing && task) {
        await updateTaskMutation.mutateAsync({
          id: task.id,
          input: {
            title: title.trim(),
            description: description.trim() || null,
            priority,
            dueDate,
          },
        });
        toast.success('Task updated successfully');
      } else {
        await createTaskMutation.mutateAsync({
          dealId: effectiveDealId,
          input: {
            title: title.trim(),
            description: description.trim() || null,
            priority,
            assignedToIds: selectedAssigneeIds,
            dueDate,
          },
        });
        toast.success('Task created successfully');
      }
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    }
  };

  const isSaving = createTaskMutation.isPending || updateTaskMutation.isPending;

  // Options for custom Select components
  const priorityOptions = [
    { value: 'HIGH', label: 'High (Urgent action)' },
    { value: 'MEDIUM', label: 'Medium (Standard)' },
    { value: 'LOW', label: 'Low (Routine touchpoint)' },
  ];

  const dealOptions = (dealsData?.deals || []).map((d) => {
    const collabCount = d.collaborators?.length ?? 0;
    const totalPeople = 1 + collabCount;
    const tooltipText = collabCount > 0
      ? `${totalPeople} people (Owner + ${collabCount} collaborator${collabCount === 1 ? '' : 's'})`
      : '1 person (Deal Owner)';

    return {
      value: d.id,
      label: (
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="truncate">
            {d.title}
            {d.company?.name ? (
              <span className="text-[#5f5f5d] font-normal"> ({d.company.name})</span>
            ) : null}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[10px] text-[#5f5f5d] shrink-0 font-medium bg-[#eceae4]/70 px-1.5 py-0.5 rounded border border-[#eceae4]"
            title={tooltipText}
          >
            <FiUsers className="h-3 w-3 text-[#8e8d8a]" />
            <span>{totalPeople}</span>
          </span>
        </div>
      ),
    };
  });

  const assignmentTooltipContent =
    'Only the Deal Owner and active Deal Collaborators on this deal can be assigned at creation time. Assignment is immutable once submitted.';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-5 bg-[#fcfbf8] border-[#eceae4]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-bold text-[#1c1c1c]">
              {isEditing ? 'Edit Task' : 'Create Task & Follow-up'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5f5f5d]">
              {isEditing
                ? 'Update task details. Assignees are locked after creation.'
                : 'Assign to one or more deal participants. Assignment is locked after creation.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2.5">
            {/* Task Title */}
            <div className="space-y-1">
              <Label htmlFor="taskTitle" className="text-[11px] font-semibold text-[#1c1c1c]">
                Task Title *
              </Label>
              <Input
                id="taskTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Review technical proposal and confirm pricing"
                required
                className="h-8 text-xs bg-white border-[#eceae4] focus-visible:ring-1 focus-visible:ring-[#1c1c1c]"
              />
            </div>

            {/* Deal Selection (Shown only when not preselected and not editing) */}
            {!propDealId && !isEditing ? (
              <div className="space-y-1">
                <Label htmlFor="dealSelect" className="text-[11px] font-semibold text-[#1c1c1c] flex items-center gap-1.5">
                  <FiBriefcase className="h-3 w-3 text-[#8e8d8a]" />
                  Associated Deal *
                </Label>
                <Select
                  id="dealSelect"
                  value={selectedDealId}
                  onChange={(e) => setSelectedDealId(e.target.value)}
                  options={dealOptions}
                  placeholder="Select associated deal..."
                  className="h-8 text-xs bg-white"
                  required
                />
              </div>
            ) : null}

            {/* Priority & Due Date Row */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Priority Dropdown */}
              <div className="space-y-1">
                <Label htmlFor="taskPriority" className="text-[11px] font-semibold text-[#1c1c1c] flex items-center gap-1.5">
                  <FiFlag className="h-3 w-3 text-[#8e8d8a]" />
                  Priority
                </Label>
                <Select
                  id="taskPriority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  options={priorityOptions}
                  className="h-8 text-xs bg-white"
                />
              </div>

              {/* Due Date Calendar Picker */}
              <div className="space-y-1">
                <Label htmlFor="taskDueDate" className="text-[11px] font-semibold text-[#1c1c1c] flex items-center gap-1.5">
                  <FiCalendar className="h-3 w-3 text-[#8e8d8a]" />
                  Due Date *
                </Label>
                <DatePicker
                  id="taskDueDate"
                  value={dueDate}
                  onChange={setDueDate}
                  required
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>

            {/* Multi-Assignee Selection Section (Creation Mode) or Locked Display (Edit Mode) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold text-[#1c1c1c] flex items-center gap-1.5">
                  <FiUsers className="h-3 w-3 text-[#8e8d8a]" />
                  {isEditing ? 'Assignees (Locked)' : 'Assign To (Multi-Select) *'}
                </Label>
                <Tooltip content={assignmentTooltipContent} side="top" align="end">
                  <span className="flex items-center gap-1 text-[10px] text-[#8e8d8a] cursor-default hover:text-[#1c1c1c] transition-colors">
                    <FiInfo className="h-3 w-3" />
                    <span>Assignment policy</span>
                  </span>
                </Tooltip>
              </div>

              {isEditing ? (
                /* Read-Only Locked Assignee Display in Edit Mode */
                <div className="p-2.5 rounded-md border border-[#eceae4] bg-[#faf9f5] space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#5f5f5d]">
                    <FiLock className="h-3 w-3 text-[#8e8d8a] shrink-0" />
                    <span>Assignees are permanent after creation. To add someone else, create a new task.</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {task?.assignees && task.assignees.length > 0 ? (
                      task.assignees.map((a) => (
                        <div
                          key={a.id || a.userId}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-[#eceae4] text-xs text-[#1c1c1c]"
                        >
                          <Avatar
                            fallback={a.user?.name ? a.user.name.slice(0, 2).toUpperCase() : 'U'}
                            className="h-4 w-4 text-[9px] font-semibold bg-[#eceae4]"
                          />
                          <span className="font-medium">{a.user?.name || 'User'}</span>
                          {a.completedAt && (
                            <span className="text-emerald-700 text-[10px] font-semibold">✓ Completed</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-[#eceae4] text-xs text-[#1c1c1c]">
                        <Avatar
                          fallback={task?.assignedTo?.name ? task.assignedTo.name.slice(0, 2).toUpperCase() : 'U'}
                          className="h-4 w-4 text-[9px] font-semibold bg-[#eceae4]"
                        />
                        <span>{task?.assignedTo?.name || 'Assigned User'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Interactive Multi-Select Checkbox List in Creation Mode */
                <div className="p-2 rounded-md border border-[#eceae4] bg-white space-y-1 max-h-[140px] overflow-y-auto">
                  {assignableUsers.length === 0 ? (
                    <div className="p-2 text-xs text-[#8e8d8a] text-center">
                      No eligible assignees found for this deal.
                    </div>
                  ) : (
                    assignableUsers.map((u) => {
                      const isSelected = selectedAssigneeIds.includes(u.id);
                      const isSelf = u.id === user?.id;
                      const isOwner = currentDeal?.ownerId === u.id || (u as any).isOwner;

                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleAssignee(u.id)}
                          className={cn(
                            'flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors text-xs select-none',
                            isSelected
                              ? 'bg-[#f4f2ec] text-[#1c1c1c]'
                              : 'hover:bg-[#faf9f5] text-[#5f5f5d]'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                                isSelected
                                  ? 'border-[#1c1c1c] bg-[#1c1c1c] text-white'
                                  : 'border-[#cfccc4] bg-white'
                              )}
                            >
                              {isSelected && <FiCheck className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <Avatar
                              fallback={u.name ? u.name.slice(0, 2).toUpperCase() : 'U'}
                              className="h-4 w-4 text-[9px] font-semibold bg-[#eceae4]"
                            />
                            <span className="font-medium truncate text-[#1c1c1c]">{u.name}</span>
                            {isSelf && (
                              <span className="text-[10px] text-[#5f5f5d] font-normal">(You)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {isOwner && (
                              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200/70 px-1 py-0.2 rounded font-medium">
                                Deal Owner
                              </span>
                            )}
                            {!isOwner && (
                              <span className="text-[10px] bg-[#eceae4]/70 text-[#5f5f5d] border border-[#eceae4] px-1 py-0.2 rounded font-medium">
                                Collaborator
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
              {!isEditing && (
                <p className="text-[10px] text-[#8e8d8a]">
                  Selected: {selectedAssigneeIds.length} person{selectedAssigneeIds.length === 1 ? '' : 's'}. Assignment is immutable once submitted.
                </p>
              )}
            </div>

            {/* Description Textarea */}
            <div className="space-y-1">
              <Label htmlFor="taskDesc" className="text-[11px] font-semibold text-[#1c1c1c]">
                Description (Optional)
              </Label>
              <Textarea
                id="taskDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Context or talking points for this task..."
                className="text-xs min-h-[48px] h-[48px] py-1.5 bg-white border-[#eceae4] focus-visible:ring-1 focus-visible:ring-[#1c1c1c]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs bg-white text-[#1c1c1c] border-[#eceae4]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="h-8 text-xs bg-[#1c1c1c] text-[#fcfbf8] hover:bg-[#333] gap-1.5 shadow-2xs"
            >
              {isSaving && <FiLoader className="h-3.5 w-3.5 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
