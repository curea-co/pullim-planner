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
 * 반응형 — **OS 정본(pullim-web `src/styles/os-tokens.css`)과 같은 한 지점(920px)으로 갈린다.**
 * - ~920px: 헤더 + 본문 + 하단 탭바(fixed). 레일·토글 없음 (정본 `@media (max-width:920px)`)
 * - 920px~: 헤더 + 레일 248px + 본문. 접으면 레일이 **완전히 숨고** 본문이 폭을 다 쓴다
 *   (정본 `.rail-collapsed .rail { display:none }` · `.rail-collapsed .shell { 1fr }`)
 *
 * 이전에는 md(768) 64px 축약 레일이라는 중간 단계가 있었으나 정본에 없는 상태라 걷어냈다.
 * 접힘도 68px 아이콘 레일이었는데 정본은 숨김이다.
 */
const CONTENT_MAX = 'mx-auto w-full max-w-[1180px]';

export function AppShell({ role, children }: Props) {
  const { collapsed, toggle } = useRailCollapse();

  return (
    <div className="bg-pullim-slate-50 flex h-screen flex-col">
      <AppHeader railCollapsed={collapsed} onToggleRail={toggle} />

      <div className="relative flex flex-1 overflow-hidden">
        {/* 접힘은 **언마운트가 아니라 숨김**이다. 정본이 `display:none` 을 쓰는 것과
            같은 방식 — 언마운트하면 레일 내부 상태·포커스·스크롤 위치가 매번 초기화된다.
            탭 순서에서 빠지는 것은 `display:none` 도 똑같이 해 주므로 언마운트할 이점이
            없다(Codex #236 — 이전 주석의 근거가 틀렸다). */}
        <aside
          id="app-rail"
          className={cn(
            'border-pullim-slate-200 bg-card os:flex os:w-[248px] hidden shrink-0 flex-col border-r',
            collapsed && 'os:hidden',
          )}
        >
          <AppSidebar />
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="bg-pullim-slate-50/80 border-b border-pullim-slate-200/70 sticky top-0 z-10 backdrop-blur-md">
            <div className={`${CONTENT_MAX} flex h-9 items-center px-4 md:px-6 xl:px-8`}>
              <Breadcrumb role={role} />
            </div>
          </div>

          {/* 탭바가 fixed 라 본문 바닥을 비워 준다 — 정본 `.main { padding-bottom: calc(96px + safe-area) }` */}
          <div
            className={`${CONTENT_MAX} px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-6 os:pb-10 xl:px-8`}
          >
            {children}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
