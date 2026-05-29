import type { ReactNode } from 'react';
import { AppHeader } from './app-header';
import { AppSidebar } from './app-sidebar';
import { BottomNav } from './bottom-nav';
import { Breadcrumb } from './breadcrumb';
import { DevResetButton } from './dev-reset-button';
import type { Role } from './nav-config';

type Props = {
  role: Role;
  children: ReactNode;
};

/**
 * 통합 앱 shell — 플래너 전용.
 *
 * 반응형:
 * - 모바일 (xs/sm): 헤더(햄버거) + 본문 + 하단 탭
 * - 태블릿 (md): 헤더 + 사이드바(축약) + 본문
 * - 데스크탑 (lg+): 헤더 + 사이드바(전체) + 본문
 */
const CONTENT_MAX = 'mx-auto w-full max-w-[1280px]';

export function AppShell({ role, children }: Props) {
  return (
    <div className="bg-pullim-slate-50 flex h-screen flex-col">
      <AppHeader role={role} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="border-pullim-slate-200 bg-card hidden shrink-0 border-r md:flex md:w-16 md:flex-col lg:w-60">
          <AppSidebar role={role} className="hidden lg:flex" />
          <AppSidebar role={role} compact className="flex lg:hidden" />
        </aside>

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
      <DevResetButton />
    </div>
  );
}
