'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { centralLoginUrl } from '@/lib/auth/central-login';

/**
 * `/login` — 자체 로그인 폼 폐기, **중앙 OS 로그인(SSO)으로 위임**.
 * - 이미 인증(또는 onboarding/forbidden): 앱(/planner)으로.
 * - 미인증/에러: 중앙 OS 로그인으로 이동. 로그인 후 `next`(=앱) 로 복귀하면 쿠키 세션 복원.
 * (기존 폼 컴포넌트 `LoginPresenter`/`auth-context.login` 은 미사용 — 후속 정리 대상.)
 */
export function LoginContainer() {
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'loading') return; // 인증 판정 대기(깜빡임 방지)
    if (
      status === 'authenticated' ||
      status === 'onboarding' ||
      status === 'forbidden'
    ) {
      window.location.assign('/planner');
    } else {
      // 미인증/에러 → 중앙 OS 로그인. next 는 앱 진입점(/planner) — /login 자기참조 루프 방지.
      window.location.assign(centralLoginUrl(`${window.location.origin}/planner`));
    }
  }, [status]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="text-pullim-slate-400 h-6 w-6 animate-spin" aria-label="로그인으로 이동 중" />
    </div>
  );
}
