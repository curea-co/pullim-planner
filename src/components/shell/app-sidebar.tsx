'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import {
  findActiveSection, studentDomains,
  type Role, type NavItem, type NavSubItem,
} from './nav-config';
import { cn } from '@/lib/utils';

type Props = {
  role: Role;
  /** 항목 클릭 시 추가 처리 (모바일 drawer 자동 닫힘 등) */
  onNavigate?: () => void;
  /** 외부 컨테이너 className */
  className?: string;
  /** "icon only" 축약 모드 — Cozy bracket (768~1023) */
  compact?: boolean;
};

/**
 * 사이드바 — 풀림 플래너 전용. 홈 + 플래너 도메인 + 활성 도메인 children 인덴트.
 *
 * Compact (≥768 <1024): 아이콘 전용. 활성 도메인 children도 아이콘.
 * Comfortable (≥1024): 풀 라벨.
 */
export function AppSidebar({ role, onNavigate, className, compact }: Props) {
  const pathname = usePathname();
  const activeSection = findActiveSection(pathname, role);

  return (
    <nav
      aria-label="플래너 메뉴"
      className={cn('flex flex-col overflow-y-auto py-3', compact ? 'px-1.5' : 'px-2', className)}
    >
      {/* 도메인 — 활성 도메인 아래에 children 인덴트로 펼침 */}
      <ul className="space-y-0.5">
        {studentDomains.map(domain => {
          const isActive = activeSection?.href === domain.href;
          const activeSubHref = isActive ? findActiveSubHref(pathname, domain.children) : undefined;
          return (
            <li key={domain.href}>
              <NavRow
                item={domain}
                pathname={pathname}
                onNavigate={onNavigate}
                compact={compact}
              />
              {isActive && domain.children && (
                <ul
                  className={cn(
                    'mt-0.5 space-y-0.5',
                    compact ? 'ml-0' : 'ml-3 border-l border-pullim-slate-200 pl-2',
                  )}
                >
                  {domain.children.map(sub => (
                    <SubNavRow
                      key={sub.href}
                      sub={sub}
                      isActive={sub.href === activeSubHref}
                      onNavigate={onNavigate}
                      compact={compact}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavRow({
  item, pathname, onNavigate, compact,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const Icon = item.icon;
  const active =
    pathname === item.href ||
    (item.href !== '/' && pathname.startsWith(item.href + '/'));

  return (
    <Link
      href={item.locked ? '#' : item.href}
      onClick={item.locked ? e => e.preventDefault() : onNavigate}
      aria-current={active ? 'page' : undefined}
      aria-disabled={item.locked || undefined}
      title={compact ? item.label : item.description}
      className={cn(
        'group flex items-center gap-2 rounded-lg text-sm font-medium transition-colors',
        compact ? 'h-11 w-full justify-center' : 'min-h-11 px-2 py-2',
        active
          ? 'bg-pullim-blue-50 text-pullim-blue-700'
          : item.locked
          ? 'text-pullim-slate-400 hover:bg-pullim-slate-50 cursor-not-allowed'
          : 'text-pullim-slate-700 hover:bg-pullim-slate-100 hover:text-pullim-slate-900',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active && 'stroke-[2.4]')} />
      {!compact && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.locked && <Lock className="text-pullim-slate-300 h-3 w-3" />}
          {item.badge !== undefined && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                item.badge === 'LIVE'
                  ? 'bg-pullim-danger animate-pulse text-white'
                  : 'bg-pullim-slate-100 text-pullim-slate-600',
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

/** 도메인 children 중 현재 pathname에 가장 잘 맞는 sub.href 반환 (가장 긴 prefix 우선) */
function findActiveSubHref(pathname: string, children: NavSubItem[] | undefined): string | undefined {
  if (!children) return undefined;
  let best: string | undefined;
  for (const sub of children) {
    if (pathname === sub.href || pathname.startsWith(sub.href + '/')) {
      if (!best || sub.href.length > best.length) {
        best = sub.href;
      }
    }
  }
  return best;
}

function SubNavRow({
  sub, isActive, onNavigate, compact,
}: {
  sub: NavSubItem;
  isActive: boolean;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const Icon = sub.icon;
  const active = isActive;

  return (
    <li>
      <Link
        href={sub.locked ? '#' : sub.href}
        onClick={sub.locked ? e => e.preventDefault() : onNavigate}
        aria-current={active ? 'page' : undefined}
        aria-disabled={sub.locked || undefined}
        title={compact ? sub.label : sub.description}
        className={cn(
          'group flex items-center gap-2 rounded-lg text-xs font-medium transition-colors',
          compact ? 'h-10 w-full justify-center' : 'min-h-10 px-2 py-2',
          active
            ? 'bg-pullim-blue-600 text-white shadow-pullim-sm'
            : sub.locked
            ? 'text-pullim-slate-400 hover:bg-pullim-slate-50 cursor-not-allowed'
            : 'text-pullim-slate-600 hover:bg-pullim-slate-100 hover:text-pullim-slate-900',
        )}
      >
        {Icon && <Icon className={cn('h-3.5 w-3.5 shrink-0', active && 'stroke-[2.4]')} />}
        {!compact && (
          <>
            <span className="flex-1 truncate">{sub.label}</span>
            {sub.locked && <Lock className={cn('h-3 w-3', active ? 'text-white/70' : 'text-pullim-slate-300')} />}
          </>
        )}
      </Link>
    </li>
  );
}
