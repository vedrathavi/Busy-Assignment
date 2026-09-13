import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthContext';
import {
  completeTaskApi,
  createTaskApi,
  deleteTaskApi,
  getTaskByIdApi,
  getTasksApi,
  reopenTaskApi,
  updateTaskApi,
} from './tasks.api';
import {
  CompleteTaskInput,
  CreateTaskInput,
  Task,
  TaskListQuery,
  TaskListResponse,
  UpdateTaskInput,
} from './tasks.types';

export function useTasks(query: TaskListQuery = {}) {
  const { user } = useAuth();
  return useQuery<TaskListResponse, Error>({
    queryKey: ['tasks', user?.id, query],
    queryFn: () => getTasksApi(query),
    staleTime: 15 * 1000,
    enabled: Boolean(user?.id),
  });
}

export function useDealTasks(dealId?: string) {
  const { user } = useAuth();
  return useQuery<TaskListResponse, Error>({
    queryKey: ['tasks', 'deal', dealId, user?.id],
    queryFn: () => getTasksApi({ dealId, limit: 50 }),
    enabled: Boolean(user?.id && dealId),
    staleTime: 15 * 1000,
  });
}

export function useTaskDetail(id?: string) {
  const { user } = useAuth();
  return useQuery<Task, Error>({
    queryKey: ['tasks', 'detail', id, user?.id],
    queryFn: () => getTaskByIdApi(id!),
    enabled: Boolean(user?.id && id),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, input }: { dealId: string; input: CreateTaskInput }) =>
      createTaskApi(dealId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', variables.dealId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      updateTaskApi(id, input),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', task.dealId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: CompleteTaskInput }) =>
      completeTaskApi(id, input),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', task.dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'history', task.dealId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useReopenTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reopenTaskApi(id),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'detail', task.dealId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTaskApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
