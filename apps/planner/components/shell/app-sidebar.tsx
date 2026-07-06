'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { plannerSection, type NavSubItem } from './nav-config';
import { cn } from '@/lib/utils';

type Props = {
  /** 항목 클릭 시 추가 처리 (모바일 drawer 자동 닫힘 등) */
  onNavigate?: () => void;
  /** 외부 컨테이너 className */
  className?: string;
  /** "icon only" 축약 모드 — Cozy bracket (768~1023) */
  compact?: boolean;
  /** lg+ 접힘 토글 상태 — 아이콘 전용 (AppShell의 useRailCollapse가 소유) */
  collapsed?: boolean;
};

/**
 * 사이드바 — 풀림 플래너 전용. 형제 앱(Q·입시·라이팅 코치) 공통 PUDS 레일 패턴:
 * mono 눈썹 라벨 + 플랫 아이템 리스트. 활성 = primary-50 틴트 + 3px 좌측 액센트 바.
 * 단일 도메인 앱이라 이전의 도메인>자식 2단 인덴트는 폐기(플랫).
 */
export function AppSidebar({ onNavigate, className, compact, collapsed }: Props) {
  const pathname = usePathname();
  const iconOnly = compact || collapsed;
  const activeHref = findActiveHref(pathname, plannerSection);

  return (
    <nav
      aria-label="플래너 메뉴"
      className={cn('flex flex-col overflow-y-auto py-3', iconOnly ? 'items-center px-1.5' : 'px-2', className)}
    >
      {!iconOnly && (
        <div className="text-[var(--text-tertiary)] px-2 pt-1 pb-1.5 font-mono text-[10px] font-medium tracking-[0.16em] uppercase">
          풀림 플래너
        </div>
      )}
      <ul className={cn('space-y-0.5', iconOnly && 'w-full')}>
        {plannerSection.map(item => (
          <NavRow
            key={item.href}
            item={item}
            isActive={item.href === activeHref}
            onNavigate={onNavigate}
            iconOnly={iconOnly}
          />
        ))}
      </ul>
    </nav>
  );
}

/** 현재 pathname에 가장 잘 맞는 href 반환 (최장 prefix 우선). query 포함 href는 exact만. */
function findActiveHref(pathname: string, items: NavSubItem[]): string | undefined {
  let best: string | undefined;
  for (const item of items) {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      if (!best || item.href.length > best.length) best = item.href;
    }
  }
  return best;
}

function NavRow({
  item, isActive, onNavigate, iconOnly,
}: {
  item: NavSubItem;
  isActive: boolean;
  onNavigate?: () => void;
  iconOnly?: boolean;
}) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.locked ? '#' : item.href}
        onClick={item.locked ? e => e.preventDefault() : onNavigate}
        aria-current={isActive ? 'page' : undefined}
        aria-disabled={item.locked || undefined}
        title={iconOnly ? item.label : item.description}
        className={cn(
          // PUDS 레일 아이템 — radius 11px, 활성=primary-50 틴트 + 3px 좌측 액센트 바(::before)
          'group relative flex items-center gap-[11px] rounded-[11px] text-sm font-medium transition-colors duration-150',
          iconOnly ? 'mx-auto h-[42px] w-[42px] justify-center' : 'min-h-11 px-3 py-2.5',
          !iconOnly &&
            "before:absolute before:top-[9px] before:bottom-[9px] before:-left-2 before:w-[3px] before:rounded-r-full before:bg-[var(--color-action-primary)] before:opacity-0 before:transition-opacity before:content-['']",
          isActive
            ? 'bg-[var(--color-primary-50)] font-semibold text-[var(--color-action-primary)] before:opacity-100'
            : item.locked
            ? 'text-[var(--text-tertiary)] cursor-not-allowed opacity-60'
            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
        )}
      >
        {Icon && <Icon className={cn('h-[19px] w-[19px] shrink-0 opacity-90', isActive && 'stroke-[2.2]')} />}
        {!iconOnly && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.locked && <Lock className="text-[var(--text-tertiary)] h-3 w-3" />}
          </>
        )}
      </Link>
    </li>
  );
}
