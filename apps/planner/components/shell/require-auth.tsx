'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * 로그인 월 가드 (스펙 §가드).
 *
 * `(student)` 그룹 전체를 감싼다. 세션은 pullim 쿠키(HttpOnly)라 클라이언트에서 `session()`
 * 결과로 인증 상태를 판정한다(흡수 §10).
 * - loading: 본문 미렌더 + 중앙 스피너 (확정 전 깜빡임 방지)
 * - unauthenticated: /login 으로 replace (비로그인 확정 시에만)
 * - onboarding: 학습 프로필 미생성 → /planner/onboarding 으로 보낸다(데이터 빈 보호 라우트에 안 가둠)
 * - error: 세션 복원이 네트워크/5xx 로 실패 — 로그인으로 보내지 않고 재시도 UI
 * - authenticated: children
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, retry, logout } = useAuth();
  // 온보딩 사용자는 온보딩 화면에선 렌더(리다이렉트 루프 방지), 그 외 보호 라우트에선 온보딩으로.
  const onOnboarding = pathname?.startsWith('/planner/onboarding') ?? false;

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'onboarding' && !onOnboarding)
      router.replace('/planner/onboarding');
  }, [status, onOnboarding, router]);

  if (status === 'error') {
    return (
      <div className="bg-pullim-slate-50 flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-pullim-slate-700 text-sm">
          연결에 문제가 있어 로그인 상태를 확인하지 못했어요.
        </p>
        <Button variant="outline" size="sm" onClick={() => retry()}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <div className="bg-pullim-slate-50 flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-pullim-slate-700 text-sm">
          플래너 이용 권한이 없어요. 플래너 패키지가 있어야 이용할 수 있어요.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => retry()}>
            다시 확인
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            다른 계정으로 로그인
          </Button>
        </div>
      </div>
    );
  }

  // authenticated, 또는 온보딩 사용자가 온보딩 화면에 있을 때만 본문을 렌더한다.
  const canRender =
    status === 'authenticated' || (status === 'onboarding' && onOnboarding);
  if (!canRender) {
    // loading / 온보딩 리다이렉트 대기 / unauthenticated 리다이렉트 대기 → 스피너.
    return (
      <div className="bg-pullim-slate-50 flex h-screen items-center justify-center">
        <Loader2 className="text-pullim-slate-500 h-6 w-6 animate-spin" />
        <span className="sr-only">불러오는 중</span>
      </div>
    );
  }

  return <>{children}</>;
}
