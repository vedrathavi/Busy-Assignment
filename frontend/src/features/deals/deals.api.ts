import { apiClient } from '@/lib/api/client';
import {
  Deal,
  DealListQuery,
  DealListResponse,
  DealStage,
  CreateDealInput,
  UpdateDealInput,
  CollaboratorResponse,
  DealHistoryResponse,
  BulkOperationResponse,
} from './deals.types';

export async function getDealsApi(query: DealListQuery = {}): Promise<DealListResponse> {
  const params: Record<string, any> = { ...query };
  if (params.stage === 'ALL') {
    delete params.stage;
  }

  const response = await apiClient.get<{
    success: boolean;
    data: Deal[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      limit: number;
      totalPages: number;
    };
  }>('/deals', { params });

  return {
    deals: response.data.data || [],
    pagination: {
      total: response.data.pagination?.total || 0,
      page: response.data.pagination?.page || query.page || 1,
      pageSize: response.data.pagination?.pageSize || query.pageSize || 10,
      totalPages: response.data.pagination?.totalPages || 1,
    },
  };
}

export async function getDealByIdApi(id: string): Promise<Deal> {
  const response = await apiClient.get<{ success: boolean; data: Deal }>(`/deals/${id}`);
  return response.data.data;
}

export async function createDealApi(input: CreateDealInput): Promise<Deal> {
  const response = await apiClient.post<{ success: boolean; data: Deal }>('/deals', input);
  return response.data.data;
}

export async function updateDealApi(id: string, input: UpdateDealInput): Promise<Deal> {
  const response = await apiClient.patch<{ success: boolean; data: Deal }>(`/deals/${id}`, input);
  return response.data.data;
}

export async function transitionDealStageApi(id: string, stage: DealStage, reason?: string): Promise<Deal> {
  const response = await apiClient.patch<{ success: boolean; data: Deal }>(`/deals/${id}/stage`, {
    stage,
    reason,
  });
  return response.data.data;
}

export async function reopenDealApi(id: string): Promise<Deal> {
  const response = await apiClient.post<{ success: boolean; data: Deal }>(`/deals/${id}/reopen`);
  return response.data.data;
}

export async function deleteDealApi(id: string): Promise<Deal> {
  const response = await apiClient.delete<{ success: boolean; data: Deal }>(`/deals/${id}`);
  return response.data.data;
}

export async function listCollaboratorsApi(dealId: string): Promise<CollaboratorResponse[]> {
  const response = await apiClient.get<{ success: boolean; data: CollaboratorResponse[] }>(
    `/deals/${dealId}/collaborators`
  );
  return response.data.data || [];
}

export async function addCollaboratorApi(dealId: string, userId: string): Promise<CollaboratorResponse> {
  const response = await apiClient.post<{ success: boolean; data: CollaboratorResponse }>(
    `/deals/${dealId}/collaborators`,
    { userId }
  );
  return response.data.data;
}

export async function removeCollaboratorApi(dealId: string, userId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(
    `/deals/${dealId}/collaborators/${userId}`
  );
  return response.data;
}

export async function addDealNoteApi(dealId: string, note: string): Promise<{ id: string; note: string; createdAt: string }> {
  const response = await apiClient.post<{ success: boolean; data: { id: string; note: string; createdAt: string } }>(
    `/deals/${dealId}/notes`,
    { note }
  );
  return response.data.data;
}

export async function getDealHistoryApi(dealId: string): Promise<DealHistoryResponse[]> {
  const response = await apiClient.get<{ success: boolean; data: DealHistoryResponse[] }>(
    `/deals/${dealId}/history`
  );
  return response.data.data || [];
}

export async function bulkAdvanceDealsApi(dealIds: string[]): Promise<BulkOperationResponse> {
  const response = await apiClient.post<BulkOperationResponse>('/deals/bulk/advance', { dealIds });
  return response.data;
}

export async function bulkReassignDealsApi(dealIds: string[], ownerId: string): Promise<BulkOperationResponse> {
  const response = await apiClient.post<BulkOperationResponse>('/deals/bulk/reassign', { dealIds, ownerId });
  return response.data;
}

export async function exportDealsCsvApi(): Promise<Blob> {
  const response = await apiClient.get('/deals/export', {
    responseType: 'blob',
  });
  return response.data;
}

export async function getDealsTrashApi(query: DealListQuery = {}): Promise<DealListResponse> {
  const params: Record<string, any> = { ...query };
  if (params.stage === 'ALL') {
    delete params.stage;
  }

  const response = await apiClient.get<{
    success: boolean;
    data: Deal[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      limit: number;
      totalPages: number;
    };
  }>('/deals/trash', { params });

  return {
    deals: response.data.data || [],
    pagination: {
      total: response.data.pagination?.total || 0,
      page: response.data.pagination?.page || query.page || 1,
      pageSize: response.data.pagination?.pageSize || query.pageSize || 10,
      totalPages: response.data.pagination?.totalPages || 1,
    },
  };
}
