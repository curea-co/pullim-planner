import type { AuthUser, IAuthProvider, SocialProvider } from "../types";
import { AuthError } from "../types";

/**
 * Mock 사용자 시드 데이터.
 * Phase β: BE의 `MockAuthGuard` 와 동일하게 fallback `student_001` 1명만 운용.
 */
export interface MockAuthUser {
  id: string;
  email?: string;
  password?: string;
  username?: string;
  avatarUrl?: string;
  claims?: Record<string, unknown>;
}

const DEFAULT_MOCK_USER: MockAuthUser = {
  id: "student_001",
  username: "풀림 학생",
};

/**
 * Mock Auth Provider.
 *
 * pullim/packages/auth 의 MockAuthProvider 패턴 차용. 실제 BE 호출 없이 메모리상의
 * 사용자 목록으로 인증을 흉내낸다. planner FE는 본 provider를 통해 `X-User-Id` 헤더에
 * 실어 보낼 사용자 id를 결정한다 (Phase η 전까지).
 *
 * @example
 * ```ts
 * import { authService, MockAuthProvider } from "@pullim-planner/auth";
 *
 * authService.setProvider(new MockAuthProvider([
 *   { id: "student_001", username: "풀림 학생" },
 * ]));
 * ```
 */
export class MockAuthProvider implements IAuthProvider {
  private readonly users: MockAuthUser[];
  private currentUser: AuthUser | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  constructor(users: MockAuthUser[] = [DEFAULT_MOCK_USER]) {
    this.users = users.length > 0 ? users : [DEFAULT_MOCK_USER];
    // Phase β: 부팅 시 첫 사용자 자동 로그인 (mock fallback).
    this.currentUser = this.toAuthUser(this.users[0]);
  }

  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    const found = this.users.find(
      (u) => u.email === email && u.password === password,
    );
    if (!found) {
      throw new AuthError(
        "이메일 또는 비밀번호가 올바르지 않습니다.",
        "invalid-credentials",
      );
    }
    const user = this.toAuthUser(found);
    this.currentUser = user;
    this.notify(user);
    return user;
  }

  async signInWithSocial(_provider: SocialProvider): Promise<AuthUser> {
    throw new AuthError(
      "MockAuthProvider는 소셜 로그인을 지원하지 않습니다.",
      "not-supported",
    );
  }

  /**
   * Mock 환경 로그아웃.
   *
   * 기본 mock 사용자는 `email/password`가 없어 한 번 `currentUser = null`이 되면
   * 다시 로그인할 방법이 없다. 따라서 mock 모드에서는 fallback 사용자(seed 첫 번째)로
   * 되돌려 세션을 복구 가능한 상태로 유지한다.
   */
  async signOut(): Promise<void> {
    const fallback = this.toAuthUser(this.users[0]);
    this.currentUser = fallback;
    this.notify(fallback);
  }

  async getSession(): Promise<AuthUser | null> {
    return this.currentUser;
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private toAuthUser(seed: MockAuthUser): AuthUser {
    return {
      id: seed.id,
      email: seed.email,
      username: seed.username,
      avatarUrl: seed.avatarUrl,
      claims: seed.claims,
    };
  }

  private notify(user: AuthUser | null): void {
    this.listeners.forEach((l) => l(user));
  }
}
