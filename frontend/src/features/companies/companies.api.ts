import { apiClient } from '@/lib/api/client';
import {
  Company,
  CompanyListQuery,
  CompanyListResponse,
  CreateCompanyInput,
  UpdateCompanyInput,
  SimilarCompany,
} from './companies.types';

export async function getCompaniesApi(query: CompanyListQuery = {}): Promise<CompanyListResponse> {
  const response = await apiClient.get<{
    success: boolean;
    data: Company[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>('/companies', {
    params: query,
  });

  return {
    companies: response.data.data || [],
    pagination: response.data.pagination || {
      total: 0,
      page: query.page || 1,
      limit: query.limit || 10,
      totalPages: 1,
    },
  };
}

export async function getCompanyByIdApi(id: string): Promise<Company> {
  const response = await apiClient.get<{ success: boolean; data: Company }>(`/companies/${id}`);
  return response.data.data;
}

export async function createCompanyApi(input: CreateCompanyInput): Promise<Company> {
  const response = await apiClient.post<{ success: boolean; data: Company }>('/companies', input);
  return response.data.data;
}

export async function updateCompanyApi(id: string, input: UpdateCompanyInput): Promise<Company> {
  const response = await apiClient.patch<{ success: boolean; data: Company }>(`/companies/${id}`, input);
  return response.data.data;
}

export async function archiveCompanyApi(id: string): Promise<Company> {
  const response = await apiClient.post<{ success: boolean; data: Company }>(`/companies/${id}/archive`);
  return response.data.data;
}

export async function restoreCompanyApi(id: string): Promise<Company> {
  const response = await apiClient.post<{ success: boolean; data: Company }>(`/companies/${id}/restore`);
  return response.data.data;
}

export async function getSimilarCompaniesApi(name: string): Promise<SimilarCompany[]> {
  if (!name || name.trim().length < 2) return [];
  const response = await apiClient.get<{ success: boolean; data: SimilarCompany[] }>('/companies/similar', {
    params: { name: name.trim() },
  });
  return response.data.data || [];
}
