import Link from 'next/link';
import type { ReactNode } from 'react';
import { PullimLogo } from '@/components/brand/logo';

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** 카드 하단 보조 영역 (예: 로그인↔회원가입 전환 링크). */
  footer: ReactNode;
};

/**
 * 인증 화면 공통 셸 — 중앙 카드 (Toss형 미니멀, 스펙 §레이아웃).
 *
 * 화면 중앙 단일 카드 + 상단 PullimLogo. 모바일은 좌우 패딩만 두고 카드 폭을 채운다.
 */
export function AuthCard({ title, subtitle, children, footer }: Props) {
  return (
    <main className="bg-pullim-slate-50 flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          aria-label="풀림 플래너 홈"
          className="mb-6 flex justify-center"
        >
          <PullimLogo size={30} />
        </Link>

        <div className="bg-card ring-foreground/10 rounded-xl px-5 py-6 ring-1">
          <div className="mb-5 text-center">
            <h1 className="text-pullim-slate-900 text-lg font-bold">{title}</h1>
            <p className="text-pullim-slate-500 mt-1 text-sm">{subtitle}</p>
          </div>
          {children}
        </div>

        <div className="text-pullim-slate-500 mt-5 text-center text-sm">
          {footer}
        </div>
      </div>
    </main>
  );
}
