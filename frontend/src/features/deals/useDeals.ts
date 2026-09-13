import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getDealsApi,
  getDealByIdApi,
  createDealApi,
  updateDealApi,
  transitionDealStageApi,
  reopenDealApi,
  deleteDealApi,
  listCollaboratorsApi,
  addCollaboratorApi,
  removeCollaboratorApi,
  addDealNoteApi,
  getDealHistoryApi,
  bulkAdvanceDealsApi,
  bulkReassignDealsApi,
  exportDealsCsvApi,
  getDealsTrashApi,
} from './deals.api';
import {
  Deal,
  DealListQuery,
  DealListResponse,
  DealStage,
  CreateDealInput,
  UpdateDealInput,
  CollaboratorResponse,
  DealHistoryResponse,
} from './deals.types';
import { useAuth } from '@/features/auth/AuthContext';

export function useDeals(query: DealListQuery = {}) {
  const { user } = useAuth();
  return useQuery<DealListResponse, Error>({
    queryKey: ['deals', user?.id, query],
    queryFn: () => getDealsApi(query),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    enabled: Boolean(user?.id),
  });
}

export function useDealDetail(id?: string) {
  const { user } = useAuth();
  return useQuery<Deal, Error>({
    queryKey: ['deals', 'detail', user?.id, id],
    queryFn: () => getDealByIdApi(id!),
    enabled: Boolean(user?.id && id),
    staleTime: 15 * 1000,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDealInput) => createDealApi(input),
    onSuccess: (newDeal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['companies', 'detail', newDeal.companyId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDealInput }) =>
      updateDealApi(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] });

      const previousDetailQueries = queryClient.getQueriesData<Deal>({
        queryKey: ['deals', 'detail'],
      });
      const previousListQueries = queryClient.getQueriesData<DealListResponse>({
        queryKey: ['deals'],
      });

      queryClient.setQueriesData<Deal>(
        { queryKey: ['deals', 'detail'] },
        (old) => {
          if (!old || old.id !== id) return old;
          const val = input.value !== undefined ? Number(input.value) : Number(old.value);
          const prob = old.stageProbability ?? 0;
          return {
            ...old,
            title: input.title !== undefined ? input.title : old.title,
            value: input.value !== undefined ? input.value : old.value,
            expectedCloseDate: input.expectedCloseDate !== undefined ? input.expectedCloseDate : old.expectedCloseDate,
            ownerId: input.ownerId !== undefined ? input.ownerId : old.ownerId,
            weightedValue: (val * prob).toFixed(2),
            updatedAt: new Date().toISOString(),
          };
        }
      );

      queryClient.setQueriesData<DealListResponse>(
        { queryKey: ['deals'] },
        (old) => {
          if (!old?.deals) return old;
          return {
            ...old,
            deals: old.deals.map((d) => {
              if (d.id !== id) return d;
              const val = input.value !== undefined ? Number(input.value) : Number(d.value);
              const prob = d.stageProbability ?? 0;
              return {
                ...d,
                title: input.title !== undefined ? input.title : d.title,
                value: input.value !== undefined ? input.value : d.value,
                expectedCloseDate: input.expectedCloseDate !== undefined ? input.expectedCloseDate : d.expectedCloseDate,
                ownerId: input.ownerId !== undefined ? input.ownerId : d.ownerId,
                weightedValue: (val * prob).toFixed(2),
                updatedAt: new Date().toISOString(),
              };
            }),
          };
        }
      );

      return { previousDetailQueries, previousListQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDetailQueries) {
        for (const [key, data] of context.previousDetailQueries) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousListQueries) {
        for (const [key, data] of context.previousListQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSuccess: (updatedDeal) => {
      queryClient.setQueriesData<Deal>(
        { queryKey: ['deals', 'detail'] },
        (old) => (old?.id === updatedDeal.id ? updatedDeal : old)
      );
      queryClient.setQueriesData<DealListResponse>(
        { queryKey: ['deals'] },
        (old) => {
          if (!old?.deals) return old;
          return {
            ...old,
            deals: old.deals.map((d) => (d.id === updatedDeal.id ? updatedDeal : d)),
          };
        }
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useTransitionDealStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, reason }: { id: string; stage: DealStage; reason?: string }) =>
      transitionDealStageApi(id, stage, reason),
    onSuccess: (updatedDeal) => {
      // Sync authoritative server response into cache
      queryClient.setQueriesData<Deal>(
        { queryKey: ['deals', 'detail'] },
        (old) => (old?.id === updatedDeal.id ? updatedDeal : old)
      );
      queryClient.setQueriesData<DealListResponse>(
        { queryKey: ['deals'] },
        (old) => {
          if (!old?.deals) return old;
          return {
            ...old,
            deals: old.deals.map((d) => (d.id === updatedDeal.id ? updatedDeal : d)),
          };
        }
      );
    },
    onSettled: () => {
      // Background revalidation
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useReopenDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reopenDealApi(id),
    onSuccess: (updatedDeal) => {
      queryClient.setQueriesData<Deal>(
        { queryKey: ['deals', 'detail'] },
        (old) => (old?.id === updatedDeal.id ? updatedDeal : old)
      );
      queryClient.setQueriesData<DealListResponse>(
        { queryKey: ['deals'] },
        (old) => {
          if (!old?.deals) return old;
          return {
            ...old,
            deals: old.deals.map((d) => (d.id === updatedDeal.id ? updatedDeal : d)),
          };
        }
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDealApi(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] });

      const previousListQueries = queryClient.getQueriesData<DealListResponse>({
        queryKey: ['deals'],
      });

      queryClient.setQueriesData<DealListResponse>(
        { queryKey: ['deals'] },
        (old) => {
          if (!old?.deals) return old;
          return {
            ...old,
            deals: old.deals.filter((d) => d.id !== id),
            pagination: {
              ...old.pagination,
              total: Math.max(0, old.pagination.total - 1),
            },
          };
        }
      );

      return { previousListQueries };
    },
    onError: (_err, _id, context) => {
      if (context?.previousListQueries) {
        for (const [key, data] of context.previousListQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'trash'] });
    },
  });
}

export function useCollaborators(dealId?: string) {
  const { user } = useAuth();
  return useQuery<CollaboratorResponse[], Error>({
    queryKey: ['deals', 'collaborators', user?.id, dealId],
    queryFn: () => listCollaboratorsApi(dealId!),
    enabled: Boolean(user?.id && dealId),
    staleTime: 15 * 1000,
  });
}

export function useAddCollaborator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, userId }: { dealId: string; userId: string }) =>
      addCollaboratorApi(dealId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRemoveCollaborator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, userId }: { dealId: string; userId: string }) =>
      removeCollaboratorApi(dealId, userId),
    onMutate: async ({ dealId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['deals', 'collaborators'] });

      const previousCollabQueries = queryClient.getQueriesData<CollaboratorResponse[]>({
        queryKey: ['deals', 'collaborators'],
      });

      queryClient.setQueriesData<CollaboratorResponse[]>(
        { queryKey: ['deals', 'collaborators'] },
        (old) => (old ? old.filter((c) => c.userId !== userId) : [])
      );

      queryClient.setQueriesData<Deal>(
        { queryKey: ['deals', 'detail'] },
        (old) => {
          if (!old || old.id !== dealId || !old.collaborators) return old;
          return {
            ...old,
            collaborators: old.collaborators.filter((c) => c.userId !== userId),
          };
        }
      );

      return { previousCollabQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCollabQueries) {
        for (const [key, data] of context.previousCollabQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', 'collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDealHistory(dealId?: string) {
  const { user } = useAuth();
  return useQuery<DealHistoryResponse[], Error>({
    queryKey: ['deals', 'history', user?.id, dealId],
    queryFn: () => getDealHistoryApi(dealId!),
    enabled: Boolean(user?.id && dealId),
    staleTime: 10 * 1000,
  });
}

export function useAddDealNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, note }: { dealId: string; note: string }) =>
      addDealNoteApi(dealId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useBulkAdvanceDeals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dealIds: string[]) => bulkAdvanceDealsApi(dealIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useBulkReassignDeals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dealIds, ownerId }: { dealIds: string[]; ownerId: string }) =>
      bulkReassignDealsApi(dealIds, ownerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useExportDealsCsv() {
  return useMutation({
    mutationFn: exportDealsCsvApi,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `deals-pipeline-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useDealsTrash(query: DealListQuery = {}) {
  const { user } = useAuth();
  return useQuery<DealListResponse, Error>({
    queryKey: ['deals', 'trash', user?.id, query],
    queryFn: () => getDealsTrashApi(query),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    enabled: Boolean(user?.id),
  });
}
