import { apiClient } from '@/lib/api/client';
import {
  CompleteTaskInput,
  CreateTaskInput,
  Task,
  TaskListQuery,
  TaskListResponse,
  UpdateTaskInput,
} from './tasks.types';

export async function getTasksApi(query: TaskListQuery = {}): Promise<TaskListResponse> {
  const params: Record<string, any> = { ...query };
  if (params.priority === 'all') delete params.priority;
  if (params.time === 'all') delete params.time;

  const response = await apiClient.get<{
    success: boolean;
    data: Task[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>('/tasks', { params });

  return {
    tasks: response.data.data || [],
    pagination: {
      total: response.data.pagination?.total || 0,
      page: response.data.pagination?.page || query.page || 1,
      limit: response.data.pagination?.limit || query.limit || 20,
      totalPages: response.data.pagination?.totalPages || 1,
    },
  };
}

export async function getTaskByIdApi(id: string): Promise<Task> {
  const response = await apiClient.get<{ success: boolean; data: Task }>(`/tasks/${id}`);
  return response.data.data;
}

export async function createTaskApi(dealId: string, input: CreateTaskInput): Promise<Task> {
  const response = await apiClient.post<{ success: boolean; data: Task }>(`/deals/${dealId}/tasks`, input);
  return response.data.data;
}

export async function updateTaskApi(id: string, input: UpdateTaskInput): Promise<Task> {
  const response = await apiClient.patch<{ success: boolean; data: Task }>(`/tasks/${id}`, input);
  return response.data.data;
}

export async function completeTaskApi(id: string, input: CompleteTaskInput = {}): Promise<Task> {
  const response = await apiClient.post<{ success: boolean; data: Task }>(`/tasks/${id}/complete`, input);
  return response.data.data;
}

export async function reopenTaskApi(id: string): Promise<Task> {
  const response = await apiClient.post<{ success: boolean; data: Task }>(`/tasks/${id}/reopen`);
  return response.data.data;
}

export async function deleteTaskApi(id: string): Promise<void> {
  await apiClient.delete(`/tasks/${id}`);
}
