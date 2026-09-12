import { useQuery } from '@tanstack/react-query';
import { getUsersApi, getUserProfileApi, UserSummary, UserProfileResponse, UserListQuery } from './users.api';
import { useAuth } from '@/features/auth/AuthContext';

export function useUsers(query: UserListQuery = {}) {
  const { user } = useAuth();
  return useQuery<UserSummary[], Error>({
    queryKey: ['users', user?.teamId, query],
    queryFn: () => getUsersApi(query),
    staleTime: 60 * 1000,
    enabled: Boolean(user?.id),
  });
}

export function useUserProfile(id?: string) {
  const { user } = useAuth();
  return useQuery<UserProfileResponse, Error>({
    queryKey: ['users', 'profile', user?.teamId, id],
    queryFn: () => getUserProfileApi(id!),
    staleTime: 30 * 1000,
    enabled: Boolean(user?.id && id),
  });
}
