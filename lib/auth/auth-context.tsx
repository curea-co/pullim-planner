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
import {
  ApiError,
  type PullimMeProfile,
  type PullimProfileUpsert,
} from '@/lib/api-client';
import { osPlanLabel, type EntitlementFlags } from '@/lib/plan-label';

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
  /**
   * **중앙 계정 이메일**(`GET /me`) — planner 엔타이틀먼트·학습 프로필과 **무관**하다.
   *
   * `user` 에 얹지 않는 이유: `/planner/me` 가 403(권한 없음)·404(온보딩 전)면 `user` 는 null 인데,
   * **그 둘도 로그인은 된 상태**다(401 만 비로그인). 계정 식별을 `user` 에 매달면 정작 그
   * 사용자들에게서 사라진다 — 서비스 노출 판정이 planner 권한에 끌려가면 안 된다.
   *
   * null = 비로그인이거나 아직 모른다. 값이 있으면 **중앙 세션이 유효하다**는 뜻이라,
   * 소비자는 status 를 따로 보지 않아도 된다.
   */
  accountEmail: string | null;
  /**
   * 헤더 프로필 드롭다운의 플랜 배지 라벨 — `'기본'`·`'유료'`, **조회 전·실패면 빈 문자열**
   * (배지 미표시). 서버 엔타이틀먼트 파생이라 OS 헤더와 같은 값이 나온다(QA #91).
   */
  planLabel: string;
  logout: () => Promise<void>;
  /**
   * 온보딩 완료 — 학습 프로필 upsert(`PATCH /planner/me`) 후 authenticated 로 전환.
   * 'onboarding' 상태(프로필 미생성)를 해소한다. 미입력 필드는 서버 기본값(부분 upsert).
   */
  completeOnboarding: (input?: PullimProfileUpsert) => Promise<void>;
  /** 'error' 상태에서 세션 복원을 재시도한다. */
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** localhost 류 호스트만 — 배포 도메인에서 우회가 절대 켜지지 않게 하는 런타임 가드. */
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/;

/**
 * 로컬 dev 전용 — 인증 게이트 우회 (`.env.local`: `NEXT_PUBLIC_DEV_AUTH_BYPASS=1`).
 *
 * pullim-api 쿠키 SSO 는 `*.pullim.ai` same-site 에서만 동작하므로 `localhost:3030` 에선 세션
 * 복원이 불가(→ 'error' 게이트). UX/UI 폴리시 등 로컬 화면 확인을 위해 게이트만 통과시킨다 —
 * 화면 콘텐츠는 어차피 `@/lib/mock` 에서 그려진다.
 *
 * ⚠️ 보안 — env 플래그만으로는 부족하다. `NEXT_PUBLIC_*` 는 preview/prod 빌드에도 주입될 수 있어
 * 운영에서 실수로 `1` 이면 누구나 즉시 authenticated 가 된다. 그래서 **3중 가드**로 막는다:
 *  ① `NODE_ENV === 'development'` — `next dev` 에서만 true(prod 빌드면 정적으로 false → tree-shake)
 *  ② 브라우저 + localhost 류 hostname — 배포 도메인에선 false
 *  ③ env 플래그 opt-in
 * 셋이 모두 참일 때만 우회. (실 데이터/인증은 prod 경로 그대로)
 */
const DEV_AUTH_BYPASS =
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' &&
  process.env.NODE_ENV === 'development' &&
  typeof window !== 'undefined' &&
  LOCAL_HOSTS.test(window.location.hostname);
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
  // 중앙 계정 이메일 — 위 계약 참조. planner 프로필과 생애주기가 다르므로 별도 상태다.
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  // 플랜 배지 flags — null = 조회 전/실패(배지 미표시), {} = 조회 성공·유료 없음('기본').
  const [entFlags, setEntFlags] = useState<EntitlementFlags | null>(null);

  // session() 으로 세션을 확정하는 공유 코어. 성공→authenticated, 401/403(무효 확정)→unauthenticated,
  // 404(온보딩 미완)→authenticated, 그 외(네트워크/5xx)→fallback. setState 는 .then 콜백(deferred)에만
  // 두어 마운트 effect 의 동기 setState 경고를 피한다.
  // - 부트스트랩/재시도: fallback='error' (세션 유효 미확인 — 로그인으로 안 쫓아내고 재시도 UI)
  // - login 직후: fallback='authenticated' (쿠키 방금 발급 — 프로필만 best-effort)
  // 헤더 배지 실명(ADR-048) — owner-only `GET /me` 의 `name`(KCB 실명, 미보유 시 서버가
  // displayName 폴백)을 best-effort 로 얹는다. 실패(네트워크 등)는 무시 — projection
  // 표시명으로 표시 연속성 유지. 계정 이메일도 같은 응답에서 보강해 서비스 노출에 사용한다.
  // 실명은 profile id, 계정 이메일은 세션 해석 세대로 늦은 응답을 차단한다.
  // 세션 확정(resolveSession)과 온보딩 완료(completeOnboarding) 양 경로 모두에서 호출.
  //
  // ⚠️ **세대(gen) 가드가 필요하다.** 실명은 `prev.id === profileId` 로 늦은 응답을 막지만
  // 이메일에는 그런 anchor 가 없다 — 만료·재로그인 뒤 도착한 응답이 새 상태를 덮을 수 있다.
  const accountGen = useRef(0);
  /** 중앙 계정 식별을 버린다 — 비로그인 확정·만료·로그아웃. 진행 중인 조회도 무효화한다. */
  const clearAccount = useCallback(() => {
    accountGen.current += 1;
    setAccountEmail(null);
  }, []);
  /**
   * `GET /me` 조회. `profileId` 가 있으면 실명까지 얹고, null 이면 **이메일만** 싣는다
   * (403·404 — planner 프로필이 없는 로그인 사용자).
   */
  const loadAccount = useCallback((profileId: string | null) => {
    const gen = accountGen.current;
    void pullimSession.accountMe().then(
      (account) => {
        if (gen !== accountGen.current) return; // 만료·재로그인 뒤 도착 — 버린다
        setAccountEmail(account.email || null);
        if (!account.name || !profileId) return;
        setUser((prev) =>
          prev && prev.id === profileId ? { ...prev, name: account.name } : prev,
        );
      },
      () => {},
    );
  }, []);

  const resolveSession = useCallback(
    (fallbackStatus: AuthStatus) => {
      // 다른 탭의 계정 교체는 만료 이벤트 없이도 발생한다. 새 세션 해석이 이전 /me와
      // 세션 응답을 함께 무효화하며, 성공·403·404 모두 이 세대에서만 계정을 확정한다.
      const gen = ++accountGen.current;
      // pullim-api 세션 확인 = GET /planner/me (쿠키 인증).
      return pullimSession.session().then(
        (profile) => {
          if (gen !== accountGen.current) return;
          setAccountEmail(null);
          setUser(profile);
          setStatus('authenticated');
          loadAccount(profile.id);
        },
        (error: unknown) => {
          if (gen !== accountGen.current) return;
          setAccountEmail(null);
          setUser(null);
          if (error instanceof ApiError) {
            if (error.statusCode === 401) {
              // 세션 없음·무효 → 비로그인 확정. 계정 식별도 함께 버린다.
              setStatus('unauthenticated');
              clearAccount();
              return;
            }
            if (error.statusCode === 403) {
              // 로그인은 됐으나 planner 엔타이틀먼트 미보유 — /login 으로 보내지 않고 안내.
              setStatus('forbidden');
              // **로그인은 된 상태다.** 중앙 계정 식별은 planner 권한과 무관하게 조회한다.
              loadAccount(null);
              return;
            }
            if (error.statusCode === 404) {
              // 인증은 됐으나 planner 학습 프로필(user_profile) 미생성 = 온보딩 미완. 비로그인이
              // 아니므로 'onboarding' 으로 두고 RequireAuth 가 /planner/onboarding 으로 보낸다(데이터가
              // 빈 보호 라우트에 가두지 않음). ⚠️ 프로필 생성은 정상 endpoint 부재(pullim-api 갭,
              // dev 는 /planner/dev/seed-profile) — 온보딩 완료 배선은 BE endpoint 후속.
              setStatus('onboarding');
              // 인증은 됐다(프로필만 없다) — 위 403 과 같은 이유로 계정 식별을 조회한다.
              loadAccount(null);
              return;
            }
          }
          // transport/5xx — 로그인 여부를 서버가 말해 주지 않았다. 모르는 것을 아는 척하지 않는다.
          setStatus(fallbackStatus);
          clearAccount();
        },
      );
    },
    [loadAccount, clearAccount],
  );

  // 부트스트랩/재시도용 — 세션 확정 불가 시 'error'.
  const loadSession = useCallback(
    () => resolveSession('error'),
    [resolveSession],
  );

  useEffect(() => {
    // pullim 쿠키 세션 만료(데이터/세션 401) 전역 전파 → 비로그인. (자체 BE onSessionExpired 대체)
    const unsubscribe = onPullimSessionExpired(() => {
      // 우회 모드 — 실 세션이 없으니 만료 전파를 무시한다(미리보기 인증 상태 고정).
      if (DEV_AUTH_BYPASS) return;
      setUser(null);
      setStatus('unauthenticated');
      clearAccount();
    });
    return unsubscribe;
  }, [clearAccount]);

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

  // 플랜 배지 소스 — 세션이 확정된 회원에 한해 `GET /me/entitlements` 1회.
  //   실패(네트워크·5xx·401)는 null 유지 = 배지 미표시. 배지 하나 때문에 셸을 막거나 재시도하지
  //   않는다. 로그아웃/만료로 status 가 바뀌면 flags 를 버려 이전 계정 배지가 남지 않게 한다.
  //   DEV_AUTH_BYPASS 는 실 세션이 없어 조회를 건너뛴다(배지 없음).
  const sessionResolved = status === 'authenticated' || status === 'onboarding';
  useEffect(() => {
    if (!sessionResolved || DEV_AUTH_BYPASS) return;
    let alive = true;
    void pullimSession.entitlements().then(
      (res) => {
        if (alive) setEntFlags(res.flags ?? {});
      },
      () => {
        // 배지 미표시로 낙하 — 조회 실패를 '기본' 으로 위장하지 않는다.
      },
    );
    // 세션이 풀리면(로그아웃·만료) flags 를 버린다 — 다음 계정에 이전 배지가 새지 않게.
    return () => {
      alive = false;
      setEntFlags(null);
    };
  }, [sessionResolved]);

  const logout = useCallback(async () => {
    // 우회 모드 — 실 세션이 없어 로그아웃은 의미 없다. 인증 상태를 고정해 미리보기를 유지한다
    // (안 그러면 unauthenticated 로 빠져 보호 라우트가 /login 으로 튕긴다 — codex).
    if (DEV_AUTH_BYPASS) {
      setUser(DEV_BYPASS_PROFILE);
      setStatus('authenticated');
      return;
    }
    // pullimSession.logout 은 서버가 쿠키를 무효화한다. BE 호출 성패와 무관하게 FE 상태는 항상
    // 초기화해 세션/상태 불일치를 막는다.
    try {
      await pullimSession.logout();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
      clearAccount();
    }
  }, [clearAccount]);

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
        // 온보딩 완료 직후에도 실명 보강 — resolveSession 경로와 배지 일관(Codex #109).
        loadAccount(profile.id);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          // 세션 만료 — 재시도가 아니라 /login 으로 회복한다. 호출부가 재시도 UI 를 안 띄우게 swallow.
          setUser(null);
          setStatus('unauthenticated');
          // 온보딩 화면에서 이미 `loadAccount()` 가 성공했거나 **아직 돌고 있을** 수 있다.
          // 세대를 올려 늦게 도착하는 응답까지 무효화한다 — 안 그러면 이전 계정 기준으로
          // 스튜디오가 잠깐 다시 뜬다(Codex #257). 비로그인 확정 경로는 전부 이 짝을 지킨다.
          clearAccount();
          return;
        }
        throw error; // 일시 오류 — 호출부(OnboardingContainer)가 재시도 UI 를 보인다.
      }
    },
    [loadAccount, clearAccount],
  );

  // 'error' 상태에서 사용자가 재시도. 클릭 핸들러라 동기 setState 가 안전하다.
  const retry = useCallback(() => {
    // accountEmail 소비자는 status 없이도 중앙 세션으로 신뢰하므로 요청 대기 중에도 비운다.
    clearAccount();
    setStatus('loading');
    void loadSession();
  }, [loadSession, clearAccount]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accountEmail,
      planLabel: osPlanLabel(entFlags),
      logout,
      completeOnboarding,
      retry,
    }),
    [
      status,
      user,
      accountEmail,
      entFlags,
      logout,
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
