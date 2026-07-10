import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getToken, setToken } from '@/lib/api';
import * as authService from '@/services/auth.service';
import type { AuthResult, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  /** True while we hydrate the session from a stored token on first load. */
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Provides authentication state to the app. On mount, if a token is present in
 * localStorage, it fetches the user profile to restore the session.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    authService
      .fetchMe()
      .then(setUser)
      .catch(() => {
        // Token invalid/expired — clear it silently.
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const persist = useCallback((result: AuthResult): User => {
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const result = await authService.login({ email, password });
      return persist(result);
    },
    [persist],
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<User> => {
      const result = await authService.register({ name, email, password });
      return persist(result);
    },
    [persist],
  );

  const logout = useCallback((): void => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access authentication state and actions. Must be used within AuthProvider. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
