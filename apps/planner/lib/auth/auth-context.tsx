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
import {
  ApiError,
  type PullimMeProfile,
  type PullimProfileUpsert,
} from '@pullim-planner/api-client';
import type { LoginRequest, SignupRequest } from '@pullim-planner/types';

import { authClient } from './client';
import { onPullimSessionExpired, pullimSession } from './pullim-session-client';

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  /** 인증됐으나 planner 학습 프로필 미생성(온보딩 미완, /planner/me 404). `RequireAuth`가
   * /planner/onboarding 으로 보낸다 — 보호 라우트(데이터 비어있음)에 가두지 않는다. */
  | 'onboarding'
  /** 인증은 됐으나 planner 엔타이틀먼트(`flags.planner`) 미보유(403). 비로그인이 아니므로 /login 으로
   * 보내지 않고 '이용 권한 없음' 안내를 보여준다. */
  | 'forbidden'
  | 'unauthenticated'
  /** 세션 복원이 transport/5xx 로 실패 — 비로그인 확정이 아니므로 /login 으로 보내지 않는다. */
  | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  /** pullim-api 세션 프로필(`GET /planner/me`). 흡수 전환 §10 — 자체 BE `AuthUser` 대체. */
  user: PullimMeProfile | null;
  login: (input: LoginRequest) => Promise<void>;
  signup: (input: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkEmail: (email: string) => Promise<boolean>;
  /**
   * 온보딩 완료 — 학습 프로필 upsert(`PATCH /planner/me`) 후 authenticated 로 전환.
   * 'onboarding' 상태(프로필 미생성)를 해소한다. 미입력 필드는 서버 기본값(부분 upsert).
   */
  completeOnboarding: (input?: PullimProfileUpsert) => Promise<void>;
  /** 'error' 상태에서 세션 복원을 재시도한다. */
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 로컬 dev 전용 — 인증 게이트 우회 (`.env.local`: `NEXT_PUBLIC_DEV_AUTH_BYPASS=1`).
 *
 * pullim-api 쿠키 SSO 는 `*.pullim.ai` same-site 에서만 동작하므로 `localhost:3030` 에선 세션
 * 복원이 불가(→ 'error' 게이트). UX/UI 폴리시 등 로컬 화면 확인을 위해 게이트만 통과시킨다 —
 * 화면 콘텐츠는 어차피 `@/lib/mock` 에서 그려진다. 기본 off + `.env.local` 미커밋이라 dev/prod 무영향.
 */
const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';
const DEV_BYPASS_PROFILE: PullimMeProfile = {
  id: 'dev-local',
  name: '개발 미리보기',
  grade: '고3',
  track: '이과',
  school: '',
  focusSubjects: [],
  weeklyHours: 0,
  preferredStudyTime: '',
  joinedAt: '2026-06-22',
  streakDays: 0,
};

/**
 * 앱 전역 인증 상태 Provider (흡수 전환 §10 — pullim 쿠키 SSO).
 *
 * 마운트 시 쿠키 세션으로 `session()`(GET /planner/me)을 호출해 세션을 복원한다(새로고침 유지).
 * 토큰은 HttpOnly 쿠키라 클라가 보관하지 않고 브라우저가 자동 첨부한다.
 * - 성공 → authenticated
 * - 401/403(세션 없음·무효 또는 엔타이틀먼트 미보유) → unauthenticated (`RequireAuth`가 /login)
 * - 404(인증됐으나 학습 프로필 미생성 = 온보딩 미완) → authenticated (온보딩 라우팅이 처리)
 * - transport/5xx → 'error' (세션 판정 불가 — 로그인으로 쫓아내지 않고 재시도 UI).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<PullimMeProfile | null>(null);

  // session() 으로 세션을 확정하는 공유 코어. 성공→authenticated, 401/403(무효 확정)→unauthenticated,
  // 404(온보딩 미완)→authenticated, 그 외(네트워크/5xx)→fallback. setState 는 .then 콜백(deferred)에만
  // 두어 마운트 effect 의 동기 setState 경고를 피한다.
  // - 부트스트랩/재시도: fallback='error' (세션 유효 미확인 — 로그인으로 안 쫓아내고 재시도 UI)
  // - login 직후: fallback='authenticated' (쿠키 방금 발급 — 프로필만 best-effort)
  const resolveSession = useCallback(
    (fallbackStatus: AuthStatus) =>
      // pullim-api 세션 확인 = GET /planner/me (쿠키 인증).
      pullimSession.session().then(
        (profile) => {
          setUser(profile);
          setStatus('authenticated');
        },
        (error: unknown) => {
          setUser(null);
          if (error instanceof ApiError) {
            if (error.statusCode === 401) {
              // 세션 없음·무효 → 비로그인 확정.
              setStatus('unauthenticated');
              return;
            }
            if (error.statusCode === 403) {
              // 로그인은 됐으나 planner 엔타이틀먼트 미보유 — /login 으로 보내지 않고 안내.
              setStatus('forbidden');
              return;
            }
            if (error.statusCode === 404) {
              // 인증은 됐으나 planner 학습 프로필(user_profile) 미생성 = 온보딩 미완. 비로그인이
              // 아니므로 'onboarding' 으로 두고 RequireAuth 가 /planner/onboarding 으로 보낸다(데이터가
              // 빈 보호 라우트에 가두지 않음). ⚠️ 프로필 생성은 정상 endpoint 부재(pullim-api 갭,
              // dev 는 /planner/dev/seed-profile) — 온보딩 완료 배선은 BE endpoint 후속.
              setStatus('onboarding');
              return;
            }
          }
          setStatus(fallbackStatus);
        },
      ),
    [],
  );

  // 부트스트랩/재시도용 — 세션 확정 불가 시 'error'.
  const loadSession = useCallback(
    () => resolveSession('error'),
    [resolveSession],
  );

  useEffect(() => {
    // pullim 쿠키 세션 만료(데이터/세션 401) 전역 전파 → 비로그인. (자체 BE onSessionExpired 대체)
    const unsubscribe = onPullimSessionExpired(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // 로컬 dev 게이트 우회 — 세션 복원 없이 바로 authenticated. (NEXT_PUBLIC_DEV_AUTH_BYPASS=1)
    // 즉시 인증이 의도라 동기 setState 사용(기본 off라 prod 무영향).
    if (DEV_AUTH_BYPASS) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setUser(DEV_BYPASS_PROFILE);
      setStatus('authenticated');
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    // 마운트 시 1회 세션 복원. StrictMode 이중 마운트면 session() 이 한 번 더 도는 정도로 무해
    // (loadSession 은 idempotent). 언마운트 후 setState 는 React 가 무시한다.
    void loadSession();
  }, [loadSession]);

  // login 성공(쿠키 발급) 후 프로필 조회. 쿠키는 방금 발급됐으므로 session() 이 네트워크/5xx 로
  // 일시 실패해도 로그인 성공으로 둔다(fallback='authenticated', 프로필은 보류). 단 401/403 이면
  // 세션 무효 확정이므로 unauthenticated 로 되돌린다(resolveSession 내부 처리).
  const completeAuth = useCallback(
    () => resolveSession('authenticated'),
    [resolveSession],
  );

  const login = useCallback(
    async (input: LoginRequest) => {
      await pullimSession.login(input);
      await completeAuth();
    },
    [completeAuth],
  );

  const signup = useCallback(
    // 흡수 §10: **자체 회원가입 폐기.** 가입 권위는 중앙(pullim-api `/auth/signup`, KCB 본인인증)이다.
    // 자체 BE 가입은 pullim 쿠키 세션과 신원 저장소가 갈려 로그인이 성립하지 않으므로 제거했다.
    // `/signup` 라우트는 `/login` 으로 리다이렉트하므로 이 경로는 도달하지 않는다(혹시 호출되면 명시
    // 차단 — 중앙 가입 배선 후 대체). dev 테스트 계정은 `seed-member {flags:{planner:1}}`.
    async () => {
      throw new ApiError({
        code: 'SIGNUP_DISABLED',
        message: '회원가입은 중앙 로그인에서 진행됩니다.',
        statusCode: 501,
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    // pullimSession.logout 은 서버가 쿠키를 무효화한다. BE 호출 성패와 무관하게 FE 상태는 항상
    // 초기화해 세션/상태 불일치를 막는다.
    try {
      await pullimSession.logout();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const checkEmail = useCallback(
    // 이메일 중복 확인은 가입 플로우 보조 — 중앙 가입 배선 전까지 자체 BE 유지(한시적).
    (email: string) => authClient.checkEmail(email),
    [],
  );

  const completeOnboarding = useCallback(
    // 온보딩 입력으로 프로필 upsert(PATCH /planner/me) → 갱신 프로필로 authenticated 전환.
    // 'onboarding' limbo 해소. 현재 온보딩은 소개 위주라 입력 없이(서버 기본값) 생성하며,
    // 학년/계열 등 수집 폼은 후속(부분 upsert 라 이후 보강 가능).
    async (input: PullimProfileUpsert = {}) => {
      try {
        // 프로필이 생기면 다음 session() 부터 /planner/me 가 200 → 서버상태 단독으로 'authenticated'.
        // (localStorage 방문 플래그로 보정하지 않는다 — 서버상태가 온보딩 완료의 단일 권위.)
        const profile = await pullimSession.updateProfile(input);
        setUser(profile);
        setStatus('authenticated');
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          // 세션 만료 — 재시도가 아니라 /login 으로 회복한다. 호출부가 재시도 UI 를 안 띄우게 swallow.
          setUser(null);
          setStatus('unauthenticated');
          return;
        }
        throw error; // 일시 오류 — 호출부(OnboardingContainer)가 재시도 UI 를 보인다.
      }
    },
    [],
  );

  // 'error' 상태에서 사용자가 재시도. 클릭 핸들러라 동기 setState 가 안전하다.
  const retry = useCallback(() => {
    setStatus('loading');
    void loadSession();
  }, [loadSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      signup,
      logout,
      checkEmail,
      completeOnboarding,
      retry,
    }),
    [
      status,
      user,
      login,
      signup,
      logout,
      checkEmail,
      completeOnboarding,
      retry,
    ],
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
