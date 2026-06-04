'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '@pullim-planner/api-client';
import type {
  AuthUser,
  LoginRequest,
  SignupRequest,
} from '@pullim-planner/types';

import { authClient, onSessionExpired } from './client';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: LoginRequest) => Promise<void>;
  signup: (input: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkEmail: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 앱 전역 인증 상태 Provider.
 *
 * 마운트 시 저장된 토큰으로 `me()`를 호출해 세션을 복원한다(새로고침 유지). 토큰이 없거나
 * 복원에 실패하면 unauthenticated. refresh 무효로 세션이 끝나면(`onSessionExpired`)
 * unauthenticated 로 전환한다 — 보호 라우트는 `RequireAuth`가 /login 으로 보낸다.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  // StrictMode 이중 마운트에서 me() 부트스트랩이 두 번 돌지 않도록 가드.
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    let cancelled = false;
    authClient
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus('unauthenticated');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginRequest) => {
    await authClient.login(input);
    const me = await authClient.me();
    setUser(me);
    setStatus('authenticated');
  }, []);

  const signup = useCallback(async (input: SignupRequest) => {
    await authClient.signup(input);
    const me = await authClient.me();
    setUser(me);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const checkEmail = useCallback(
    (email: string) => authClient.checkEmail(email),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, signup, logout, checkEmail }),
    [status, user, login, signup, logout, checkEmail],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

/** 인증 상태/액션 훅. `AuthProvider` 하위에서만 사용. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}

/** ApiError 코드를 사용자용 한국어 메시지로 변환한다. */
export function authErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  return fallback;
}
