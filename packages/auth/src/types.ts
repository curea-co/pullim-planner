/**
 * 인증된 사용자 정보.
 *
 * pullim/packages/auth 패턴 차용. Phase β 시점에는 mock fallback ID (`student_001`)
 * 로 채워지지만, 향후 실인증 도입 시 동일 인터페이스로 교체된다.
 */
export interface AuthUser {
  id: string;
  email?: string;
  username?: string;
  /** 프로필 이미지 URL */
  avatarUrl?: string;
  /** 커스텀 클레임 (역할, 권한 등) */
  claims?: Record<string, unknown>;
}

/**
 * 소셜 로그인 Provider 종류.
 * Phase β 시점 planner 도메인은 미사용 — 인터페이스만 정의.
 */
export type SocialProvider = "google" | "kakao" | "github" | "apple";

/**
 * Auth Provider 인터페이스.
 *
 * pullim/packages/auth 의 IAuthProvider 와 시그니처 동일. planner FE에서 추후
 * `authService.setProvider(new MockAuthProvider(...))` 형태로 주입한다.
 *
 * ## 구현체
 * - `MockAuthProvider` — 헤더 기반 mock (Phase β 기본값)
 * - `ApiAuthProvider` — Phase η에서 실제 BE 연동 시 추가 예정
 */
export interface IAuthProvider {
  /** 이메일/비밀번호로 로그인. 실패 시 AuthError를 throw. */
  signInWithEmail(email: string, password: string): Promise<AuthUser>;

  /** 소셜 로그인 시작. Phase η까지 미구현. */
  signInWithSocial(provider: SocialProvider): Promise<AuthUser>;

  /** 로그아웃. */
  signOut(): Promise<void>;

  /** 현재 세션의 사용자. 미로그인 시 null. */
  getSession(): Promise<AuthUser | null>;

  /**
   * 인증 상태 변경 구독.
   * 반환된 함수를 호출하면 구독 해제.
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}

/**
 * Auth 에러 클래스.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    /** 에러 코드 (예: "invalid-credentials", "user-not-found") */
    public readonly code: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
