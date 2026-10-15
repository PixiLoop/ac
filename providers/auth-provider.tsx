'use client';

import React, {
  createContext,
  useContext,
  useEffect,
} from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../lib/api-client';

type AuthContextType = {
  user: any | null;
  roles: string[];
  permissions: string[];
  isSystem: boolean;
  loading: boolean;
  error: any;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  syncUser: (fresh?: any) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const fetcher = async (url: string) => {
  const res = await api.get(url);
  // support both { data: { ... } } and direct payload
  return res.data?.data ?? res.data;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  //PUBLIC ROUTES (NO /auth/me)
  const isPublicRoute =
    pathname === '/login' ||
    pathname?.startsWith('/auth/forgot') ||
    pathname?.startsWith('/auth/reset') ||
    pathname?.startsWith('/auth/activate') ||
    pathname?.startsWith('/auth/change-password');

  const swrKey = isPublicRoute ? null : '/auth/me';

  /* ---------- SWR ---------- */

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(swrKey, fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    errorRetryCount: 0,
  });

  const wrapped = data ?? null;

  /* ---------- LOGOUT ON AUTH FAILURE (ONLY /auth/me 401) ---------- */

  useEffect(() => {
    sessionStorage.removeItem('isLoggingOut');
    if (!error) return;

    // prevent logout loop when user explicitly logs out
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('isLoggingOut')) return;
    }

    const status = error?.response?.status;

    if (status === 401 && !isPublicRoute) {
      logout();
    }
  }, [error, isPublicRoute]);

  //SYNC USER
  const syncUser = async (fresh?: any) => {
    if (!mutate) return;
    if (fresh) {
      await mutate(fresh, false);
    } else {
      await mutate();
    }
  };

  //LOGIN
  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user: loginUser } = res.data.data;

    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }

    let cachePayload: any = null;

    try {
      const meRes = await api.get('/auth/me');
      const fetched = meRes.data?.data ?? meRes.data;

      cachePayload =
        fetched && typeof fetched === 'object' && 'user' in fetched
          ? fetched
          : { user: fetched };

      await globalMutate('/auth/me', cachePayload, false);
    } catch {
      // fallback to login response
      cachePayload = { user: loginUser };
    }

    const effectiveUser = cachePayload?.user ?? loginUser;

    if (effectiveUser?.mustChangePassword) {
      router.push('/profile');
    } else if (effectiveUser?.defaultLandingPage === 'FieldServices') {
      router.push('/field-services');
    } else {
      router.push('/profile');
    }
  };
  //Logout
  const logout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('isLoggingOut', '1');

      const rt = localStorage.getItem('refreshToken');
      if (rt) {
        try {
          await api.post('/auth/logout', { refreshToken: rt });
        } catch {
          // ignore
        }
      }

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }

    router.replace('/login');
  };

  //REFRESH TOKEN
  const refresh = async () => {
    if (typeof window === 'undefined') return;

    const rt = localStorage.getItem('refreshToken');
    if (!rt) return;

    const res = await api.post('/auth/refresh', { refreshToken: rt });
    const { accessToken, refreshToken } = res.data.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    await mutate();
  };

    const roles = wrapped?.roles ?? [];
    const rawPermissions = wrapped?.permissions ?? [];
    // Detect system role
    const isSystem = roles?.some((r: any) => r?.isSystem === true);
    // If system role → grant virtual wildcard permission
    const permissions = isSystem? ['*'] // virtual full-access
    : rawPermissions;

  const value: AuthContextType = {
    user: wrapped?.user ?? null,
    roles: wrapped?.roles ?? [],
    permissions: wrapped?.permissions ?? [],
    isSystem,
    loading: !isPublicRoute && isLoading,
    error,
    login,
    logout,
    refresh,
    syncUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

//HOOK
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
