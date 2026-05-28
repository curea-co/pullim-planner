import type { AuthUser, IAuthProvider, SocialProvider } from "./types";
import { MockAuthProvider } from "./providers/mock";

/**
 * 인증 서비스 (싱글톤 facade).
 *
 * pullim/packages/auth 의 `authService` 패턴 차용. 앱 부팅 시 `setProvider()`로
 * 구현체를 주입하고, 컴포넌트는 본 facade를 통해 인증 작업을 수행한다.
 *
 * 기본 provider는 `MockAuthProvider` 이므로 별도 setProvider 호출 없이 곧장 사용 가능.
 */
class AuthService {
  private provider: IAuthProvider = new MockAuthProvider();

  /** 인증 구현체를 설정한다. */
  setProvider(provider: IAuthProvider): void {
    this.provider = provider;
  }

  signInWithEmail(email: string, password: string): Promise<AuthUser> {
    return this.provider.signInWithEmail(email, password);
  }

  signInWithSocial(provider: SocialProvider): Promise<AuthUser> {
    return this.provider.signInWithSocial(provider);
  }

  signOut(): Promise<void> {
    return this.provider.signOut();
  }

  getSession(): Promise<AuthUser | null> {
    return this.provider.getSession();
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    return this.provider.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();
