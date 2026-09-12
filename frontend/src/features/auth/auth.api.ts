import { apiClient, ApiResponse } from '@/lib/api/client';
import { LoginCredentials, LoginResponseData, User } from './auth.types';

export async function loginApi(credentials: LoginCredentials): Promise<LoginResponseData> {
  const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', credentials);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Login failed');
  }
  return response.data.data;
}

export async function getMeApi(): Promise<User> {
  const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
  if (!response.data.success || !response.data.data?.user) {
    throw new Error(response.data.message || 'Failed to fetch user profile');
  }
  return response.data.data.user;
}
