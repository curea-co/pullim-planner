'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { centralLoginUrl, canCentralLogin } from '@/lib/auth/central-login';

/**
 * `/login` — 자체 로그인 폼 폐기, **중앙 로그인(SSO)으로 위임**.
 * - 인증(또는 onboarding/forbidden): 앱(/planner)으로.
 * - **`unauthenticated` 만** 중앙 로그인으로 이동(로그인 후 `next`=앱 로 복귀 → 쿠키 세션 복원).
 * - **`error`**(transport/5xx 세션 판정 실패): SSO로 튕기지 않고 **재시도 UI**로 둔다.
 *   (RequireAuth 와 동일 — 그래야 인증서버/네트워크 장애 시 SSO↔복귀 루프 없이 복구 가능.)
 * (자체 로그인 폼·`auth-context.login` 은 2026-07-31 제거 — 로그인/가입 UI는 OS(pullim-web)가 전담.)
 */
export function LoginContainer() {
  const { status, retry } = useAuth();

  useEffect(() => {
    if (
      status === 'authenticated' ||
      status === 'onboarding' ||
      status === 'forbidden'
    ) {
      window.location.assign('/planner');
    } else if (status === 'unauthenticated') {
      // 미인증만 중앙 로그인으로. next 는 앱 진입점(/planner) — /login 자기참조 루프 방지.
      // 중앙 로그인 불가(SSO 불가 호스트·env 미설정)면 앱으로 보내 RequireAuth 안내를 재사용.
      const url = canCentralLogin()
        ? centralLoginUrl(`${window.location.origin}/planner`)
        : null;
      window.location.assign(url ?? '/planner');
    }
    // loading: 판정 대기 / error: 아래 재시도 UI — 둘 다 리다이렉트 안 함.
  }, [status]);

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

  // loading / 인증됨(리다이렉트 대기) / 미인증(SSO 이동 대기) → 스피너
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="text-pullim-slate-400 h-6 w-6 animate-spin" aria-label="로그인 확인 중" />
    </div>
  );
}
