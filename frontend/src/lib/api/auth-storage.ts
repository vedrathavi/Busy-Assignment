const TOKEN_KEY = 'busy_sales_crm_token';

type AuthListener = (token: string | null) => void;
const listeners: Set<AuthListener> = new Set();

export const authStorage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      listeners.forEach((listener) => listener(token));
    } catch (e) {
      console.error('Failed to save auth token to localStorage', e);
    }
  },

  removeToken(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      listeners.forEach((listener) => listener(null));
    } catch (e) {
      console.error('Failed to remove auth token from localStorage', e);
    }
  },

  subscribe(listener: AuthListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
