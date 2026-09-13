import { TaskPriority } from '@prisma/client';

export { TaskPriority };

export interface TaskUserSummary {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface TaskDealSummary {
  id: string;
  title: string;
  stage: string;
}

export interface TaskCompanySummary {
  id: string;
  name: string;
}

export interface TaskAssigneeSummary {
  id: string;
  userId: string;
  assignedAt: Date;
  completedAt: Date | null;
  completionNote: string | null;
  user: TaskUserSummary;
}

export interface TaskResponse {
  id: string;
  teamId: string;
  dealId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  createdById: string;
  assignedToId: string | null;
  dueDate: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: TaskUserSummary;
  assignedTo?: TaskUserSummary | null;
  assignees: TaskAssigneeSummary[];
  deal: TaskDealSummary;
  company: TaskCompanySummary;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  assignedToIds?: string[];
  assignedToId?: string;
  dueDate: string | Date;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | Date;
}

export interface CompleteTaskInput {
  completionNote?: string;
}

export interface TaskListQuery {
  dealId?: string;
  scope?: 'mine' | 'assigned_to_me' | 'assigned_by_me' | 'team';
  status?: 'all' | 'open' | 'completed';
  time?: 'all' | 'today' | 'upcoming' | 'overdue';
  priority?: 'all' | 'low' | 'medium' | 'high';
  assignedToId?: string;
  page: number;
  limit: number;
}

export interface TaskSummary {
  open: number;
  dueToday: number;
  overdue: number;
}

export interface TaskListResponse {
  tasks: TaskResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: TaskSummary;
}
