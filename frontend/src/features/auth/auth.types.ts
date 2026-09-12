export type UserRole = 'MANAGER' | 'SALES_REP';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  teamId: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponseData {
  user: User;
  token: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isManager: boolean;
  isSalesRep: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
