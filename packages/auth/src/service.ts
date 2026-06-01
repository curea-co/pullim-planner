import type { AuthUser, IAuthProvider, SocialProvider } from "./types";
import { MockAuthProvider } from "./providers/mock";

/**
 * 인증 서비스 facade.
 *
 * pullim/packages/auth 의 `authService` 패턴 차용. 앱 부팅 시 `setProvider()`로
 * 구현체를 주입하고, 컴포넌트는 본 facade를 통해 인증 작업을 수행한다.
 *
 * 기본 provider는 `MockAuthProvider` 이므로 별도 setProvider 호출 없이 곧장 사용 가능.
 *
 * ⚠ **상태 격리 주의**: 본 클래스 인스턴스는 `provider` 의 in-memory 세션 상태를 들고 있다.
 * 따라서 **프로세스 전역 singleton 으로 서버에서 공유하면 안 된다** — 한 요청의
 * `signOut()`/`setProvider()` 가 같은 프로세스의 다른 사용자 요청에 새어 나간다
 * (codex R11 지적). 서버(Next.js RSC/route handler)에서는 세션을 전역 facade 가 아니라
 * `headers()` 에서 직접 읽고, 인스턴스가 필요하면 {@link createAuthService} 로 요청 단위
 * 인스턴스를 만든다. 전역 {@link authService} singleton 은 브라우저(클라이언트)에서만 쓴다.
 */
export class AuthService {
  private provider: IAuthProvider;

  constructor(provider: IAuthProvider = new MockAuthProvider()) {
    this.provider = provider;
  }

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

/**
 * 요청 단위(또는 사용 단위) `AuthService` 인스턴스를 생성한다.
 *
 * 서버 런타임에서 facade 인스턴스가 필요하면 전역 singleton 대신 본 팩토리로 매 요청마다
 * 새 인스턴스를 만들어 상태 누수를 막는다.
 */
export function createAuthService(provider?: IAuthProvider): AuthService {
  return new AuthService(provider);
}

/** 브라우저(클라이언트) 환경 여부. */
const isBrowser = typeof window !== "undefined";

/**
 * 전역 singleton facade — **클라이언트 전용**.
 *
 * 서버 런타임(`typeof window === "undefined"`)에서 메서드를 호출하면, 전역 상태 공유로 인한
 * 요청 간 세션 누수를 막기 위해 즉시 throw 한다. 서버에서는 `headers()` 에서 직접 읽거나
 * {@link createAuthService} 로 요청 단위 인스턴스를 사용할 것.
 */
const clientOnlyAuthService = new AuthService();

export const authService: AuthService = isBrowser
  ? clientOnlyAuthService
  : new Proxy(clientOnlyAuthService, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === "function") {
          return () => {
            throw new Error(
              `[@pullim-planner/auth] 전역 authService 는 클라이언트 전용입니다. ` +
                `서버에서는 요청 간 세션 상태가 누수되므로 사용할 수 없습니다. ` +
                `서버에서는 headers() 에서 직접 읽거나 createAuthService() 로 요청 단위 인스턴스를 만드세요.`,
            );
          };
        }
        return value;
      },
    });
