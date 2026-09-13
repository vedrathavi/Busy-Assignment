export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

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
  assignedAt: string;
  completedAt: string | null;
  completionNote: string | null;
  user: TaskUserSummary;
}

export interface Task {
  id: string;
  teamId: string;
  dealId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  createdById: string;
  assignedToId: string | null;
  dueDate: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  assignedToIds: string[];
  dueDate: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string;
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
  page?: number;
  limit?: number;
}

export interface TaskSummary {
  open: number;
  dueToday: number;
  overdue: number;
}

export interface TaskListResponse {
  tasks: Task[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary?: TaskSummary;
}
