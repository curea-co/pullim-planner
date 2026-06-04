'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * 로그인 월 가드 (스펙 §가드).
 *
 * `(student)` 그룹 전체를 감싼다. 토큰이 localStorage 라 서버 미들웨어가 못 읽으므로
 * 클라이언트에서 인증 상태를 판정한다.
 * - loading: 본문 미렌더 + 중앙 스피너 (authenticated 확정 전 mock 데이터 깜빡임 방지)
 * - unauthenticated: /login 으로 replace
 * - authenticated: children
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

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
