'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * 로그인 월 가드 (스펙 §가드).
 *
 * `(student)` 그룹 전체를 감싼다. 토큰이 localStorage 라 서버 미들웨어가 못 읽으므로
 * 클라이언트에서 인증 상태를 판정한다.
 * - loading: 본문 미렌더 + 중앙 스피너 (authenticated 확정 전 mock 데이터 깜빡임 방지)
 * - unauthenticated: /login 으로 replace (비로그인 확정 시에만)
 * - error: 세션 복원이 네트워크/5xx 로 실패 — 로그인으로 보내지 않고 재시도 UI
 * - authenticated: children
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, retry } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

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

  if (status !== 'authenticated') {
    return (
      <div className="bg-pullim-slate-50 flex h-screen items-center justify-center">
        <Loader2 className="text-pullim-slate-500 h-6 w-6 animate-spin" />
        <span className="sr-only">불러오는 중</span>
      </div>
    );
  }

  return <>{children}</>;
}
