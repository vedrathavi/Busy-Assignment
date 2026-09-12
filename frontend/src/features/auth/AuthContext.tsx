import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContextType, LoginCredentials, User } from './auth.types';
import { getMeApi, loginApi } from './auth.api';
import { authStorage } from '@/lib/api/auth-storage';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => authStorage.getToken());
  const [isLoading, setIsLoading] = useState(true);

  // Clear query cache whenever auth state is reset
  const resetQueryCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  // Restore session on initial boot or token change
  const restoreSession = useCallback(async () => {
    const currentToken = authStorage.getToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await getMeApi();
      setUser(userData);
      setToken(currentToken);
    } catch {
      // Token is invalid or expired
      authStorage.removeToken();
      setUser(null);
      setToken(null);
      resetQueryCache();
    } finally {
      setIsLoading(false);
    }
  }, [resetQueryCache]);

  useEffect(() => {
    restoreSession();

    // Listen to token changes from authStorage (e.g. 401 interceptor removal)
    const unsubscribe = authStorage.subscribe((newToken) => {
      setToken(newToken);
      if (!newToken) {
        setUser(null);
        resetQueryCache();
      }
    });

    return () => unsubscribe();
  }, [restoreSession, resetQueryCache]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      // Clear previous user's query cache before logging in
      resetQueryCache();
      const data = await loginApi(credentials);
      authStorage.setToken(data.token);
      setToken(data.token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, [resetQueryCache]);

  const logout = useCallback(() => {
    authStorage.removeToken();
    setToken(null);
    setUser(null);
    resetQueryCache();
  }, [resetQueryCache]);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getMeApi();
      setUser(userData);
    } catch {
      logout();
    }
  }, [logout]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      isManager: user?.role === 'MANAGER',
      isSalesRep: user?.role === 'SALES_REP',
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
