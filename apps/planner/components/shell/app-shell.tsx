'use client';

import type { ReactNode } from 'react';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';
import { BottomNav } from './bottom-nav';
import { Breadcrumb } from './breadcrumb';
import { useRailCollapse } from './use-rail-collapse';
import type { Role } from './nav-config';
import { cn } from '@/lib/utils';

type Props = {
  role: Role;
  children: ReactNode;
};

/**
 * 통합 앱 shell — 플래너 전용. 형제 앱(Q·코치) 공통 PUDS 셸:
 * 접기 토글(lg)은 useRailCollapse가 localStorage 영속, children은 서버 렌더 유지.
 *
 * 반응형:
 * - 모바일 (xs/sm): 헤더 + 본문 + 하단 탭 (햄버거 없음 — OS 정합: 탭바+프로필 메뉴로 일원화)
 * - 태블릿 (md): 헤더 + 사이드바(축약 64px) + 본문
 * - 데스크탑 (lg+): 헤더 + 사이드바(펼침 248px ↔ 접힘 68px 토글) + 본문
 */
const CONTENT_MAX = 'mx-auto w-full max-w-[1180px]';

export function AppShell({ role, children }: Props) {
  const { collapsed, toggle } = useRailCollapse();

  return (
    <div className="bg-pullim-slate-50 flex h-screen flex-col">
      <AppHeader />

      <div className="relative flex flex-1 overflow-hidden">
        <aside
          className={cn(
            'border-pullim-slate-200 bg-card hidden shrink-0 border-r transition-[width] duration-200 md:flex md:w-16 md:flex-col',
            collapsed ? 'lg:w-[68px]' : 'lg:w-[248px]',
          )}
        >
          <AppSidebar collapsed={collapsed} className="hidden lg:flex" />
          <AppSidebar compact className="flex lg:hidden" />
        </aside>

        {/* 접기 토글 — 레일 경계선 위 28px 원형 셰브론 (형제 앱 공통, lg 전용) */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          className={cn(
            'border-pullim-slate-200 bg-card text-[var(--text-tertiary)] absolute top-5 z-30 hidden h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border shadow-md transition-[left,color,border-color] duration-200 hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)] lg:flex',
            collapsed ? 'left-[68px]' : 'left-[248px]',
          )}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={cn('transition-transform duration-200', collapsed && 'rotate-180')}
          >
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>

        <main className="flex-1 overflow-y-auto">
          <div className="bg-pullim-slate-50/80 border-b border-pullim-slate-200/70 sticky top-0 z-10 backdrop-blur-md">
            <div className={`${CONTENT_MAX} flex h-9 items-center px-4 md:px-6 xl:px-8`}>
              <Breadcrumb role={role} />
            </div>
          </div>

          <div className={`${CONTENT_MAX} px-4 pt-4 pb-24 md:px-6 md:pb-10 xl:px-8`}>
            {children}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
