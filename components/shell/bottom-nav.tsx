'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { studentBottomTabs } from './nav-config';
import { cn } from '@/lib/utils';

/**
 * 모바일 하단 탭 — 학생만 사용 (md 미만 노출).
 * 데스크탑에선 사이드바가 같은 역할을 하므로 숨김.
 */
export function BottomNav() {
  const pathname = usePathname();

  // 하단탭이 아닌 '메뉴 라우트'(프로필 메뉴로 이동) — 홈의 `/planner` prefix가 잘못 잡아 오표시되는 걸 막는다.
  // OI-1: 소개/안내(/planner/onboarding)를 탭에서 프로필 메뉴로 내림 → 이 화면에선 어떤 탭도 active 아님.
  const MENU_ROUTES = ['/planner/onboarding'];

  // 가장 긴 matchPrefix를 가진 탭 1개만 active — `/planner/manage` 진입 시 "홈" 탭과 동시 active 회귀 방지
  const activeIdx = (() => {
    if (MENU_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) return -1;
    let bestIdx = -1;
    let bestLen = -1;
    studentBottomTabs.forEach((tab, i) => {
      tab.matchPrefix.forEach(p => {
        if (pathname === p || pathname.startsWith(p + '/')) {
          const len = p === '/' ? 0 : p.length;
          if (len > bestLen) {
            bestLen = len;
            bestIdx = i;
          }
        }
      });
    });
    return bestIdx;
  })();

  return (
    <nav
      aria-label="학생 메인 네비게이션"
      className={cn(
        // 정본 os-tokens.css `.tabbar` — fixed · 62px + safe-area · z-70 · blur.
        // sticky 였을 때는 본문 스크롤 컨테이너에 묶여 높이·safe-area 보정이 없었다.
        'bg-background/92 fixed right-0 bottom-0 left-0 z-[70] border-t backdrop-blur-md os:hidden',
        'h-[calc(62px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="flex w-full">
        {studentBottomTabs.map((item, i) => {
          const Icon = item.icon;
          const active = i === activeIdx;
          return (
            <li key={item.href} className="flex-1 min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                  active
                    ? 'text-pullim-blue-600'
                    : 'text-pullim-slate-500 hover:text-pullim-slate-800',
                )}
              >
                <Icon className={cn('h-[21px] w-[21px]', active && 'stroke-[2.4]')} />
                <span className="truncate max-w-full">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
