import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getCompaniesApi,
  getCompanyByIdApi,
  createCompanyApi,
  updateCompanyApi,
  archiveCompanyApi,
  restoreCompanyApi,
  getSimilarCompaniesApi,
} from './companies.api';
import {
  Company,
  CompanyListQuery,
  CompanyListResponse,
  CreateCompanyInput,
  UpdateCompanyInput,
  SimilarCompany,
} from './companies.types';
import { useAuth } from '@/features/auth/AuthContext';

export function useCompanies(query: CompanyListQuery = {}) {
  const { user } = useAuth();
  return useQuery<CompanyListResponse, Error>({
    queryKey: ['companies', user?.id, query],
    queryFn: () => getCompaniesApi(query),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    enabled: Boolean(user?.id),
  });
}

export function useCompanyDetail(id?: string) {
  const { user } = useAuth();
  return useQuery<Company, Error>({
    queryKey: ['companies', 'detail', user?.id, id],
    queryFn: () => getCompanyByIdApi(id!),
    enabled: Boolean(user?.id && id),
    staleTime: 30 * 1000,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompanyInput) => createCompanyApi(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCompanyInput }) =>
      updateCompanyApi(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', 'detail', variables.id] });
    },
  });
}

export function useArchiveCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveCompanyApi,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', 'detail', id] });
    },
  });
}

export function useRestoreCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreCompanyApi,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', 'detail', id] });
    },
  });
}

export function useSimilarCompanies(name: string) {
  const trimmed = name?.trim() || '';
  return useQuery<SimilarCompany[], Error>({
    queryKey: ['companies', 'similar', trimmed],
    queryFn: () => getSimilarCompaniesApi(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 10 * 1000,
  });
}

