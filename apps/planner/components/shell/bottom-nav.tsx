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

  // 가장 긴 matchPrefix를 가진 탭 1개만 active — `/planner/manage` 진입 시 "홈" 탭과 동시 active 회귀 방지
  const activeIdx = (() => {
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
      className="bg-background/95 safe-bottom sticky bottom-0 z-30 border-t backdrop-blur-md md:hidden"
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
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.4]')} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
