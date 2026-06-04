'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  /** 세션 복원이 transport/5xx 로 실패 — 비로그인 확정이 아니므로 /login 으로 보내지 않는다. */
  | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (input: LoginRequest) => Promise<void>;
  signup: (input: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkEmail: (email: string) => Promise<boolean>;
  /** 'error' 상태에서 세션 복원을 재시도한다. */
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 앱 전역 인증 상태 Provider.
 *
 * 마운트 시 저장된 토큰으로 `me()`를 호출해 세션을 복원한다(새로고침 유지).
 * - 성공 → authenticated
 * - 401/403(토큰 없음·무효; refresh 도 무효) → unauthenticated (`RequireAuth`가 /login)
 * - transport/5xx → 'error' (세션 판정 불가 — 로그인으로 쫓아내지 않고 재시도 UI). api-client 가
 *   refresh 401/403 일 때만 토큰을 폐기하는 계약과 정합.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  // 세션 복원 코어. setState 를 .then 콜백(deferred)에만 두어 마운트 effect 의 동기 setState
  // 경고를 피한다. 초기 status 는 'loading' 이고, retry 는 호출 전 loading 을 세팅한다.
  const loadSession = useCallback(
    () =>
      authClient.me().then(
        (me) => {
          setUser(me);
          setStatus('authenticated');
        },
        (error: unknown) => {
          setUser(null);
          // 비로그인 확정(토큰 없음/무효)일 때만 unauthenticated. 그 외(네트워크·5xx)는 error.
          if (
            error instanceof ApiError &&
            (error.statusCode === 401 || error.statusCode === 403)
          ) {
            setStatus('unauthenticated');
          } else {
            setStatus('error');
          }
        },
      ),
    [],
  );

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // 마운트 시 1회 세션 복원. StrictMode 이중 마운트면 me() 가 한 번 더 도는 정도로 무해
    // (loadSession 은 idempotent). 언마운트 후 setState 는 React 가 무시한다.
    void loadSession();
  }, [loadSession]);

  // 토큰 발급(login/signup) 성공 후: 인증 확정 + 프로필 best-effort 로드.
  // 토큰은 이미 저장됐으므로 곧바로 authenticated 로 둔다. 뒤이은 /auth/me 가 일시 실패해도
  // 로그인 자체를 실패로 만들지 않는다(토큰 발급 성공 ↔ 프로필 조회 실패 분리). 프로필은
  // 다음 새로고침/retry 에서 채워진다.
  const completeAuth = useCallback(async () => {
    setStatus('authenticated');
    try {
      setUser(await authClient.me());
    } catch {
      setUser(null);
    }
  }, []);

  const login = useCallback(
    async (input: LoginRequest) => {
      await authClient.login(input);
      await completeAuth();
    },
    [completeAuth],
  );

  const signup = useCallback(
    async (input: SignupRequest) => {
      await authClient.signup(input);
      await completeAuth();
    },
    [completeAuth],
  );

  const logout = useCallback(async () => {
    // authClient.logout 은 BE 호출 성패와 무관하게 로컬 토큰을 폐기한다(finally). FE 상태도
    // 동일하게 항상 초기화해 토큰/상태 불일치를 막는다.
    try {
      await authClient.logout();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const checkEmail = useCallback(
    (email: string) => authClient.checkEmail(email),
    [],
  );

  // 'error' 상태에서 사용자가 재시도. 클릭 핸들러라 동기 setState 가 안전하다.
  const retry = useCallback(() => {
    setStatus('loading');
    void loadSession();
  }, [loadSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, signup, logout, checkEmail, retry }),
    [status, user, login, signup, logout, checkEmail, retry],
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
