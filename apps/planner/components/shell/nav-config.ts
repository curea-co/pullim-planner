/**
 * 네비게이션 설정 — 사이드바·하단탭·브레드크럼이 모두 이 파일을 참조.
 * 풀림 플래너 전용 (extracted from pullim-study demo).
 */

import {
  Home, CalendarClock, Wrench, FileText, BookOpen, Share2, Repeat2,
  type LucideIcon,
} from 'lucide-react';
import { REPORTS_ENABLED, ROUTINE_ENABLED } from '@/lib/flags';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  /** 활성 상태로 인식할 추가 prefix */
  matchPrefix?: string[];
  /** 출시 전 잠금 표시 */
  locked?: boolean;
  /** 한 줄 설명 — 검색 결과·툴팁 */
  description?: string;
  /** 섹션 — 이 prefix로 진입하면 사이드바가 children 전용으로 swap */
  children?: NavSubItem[];
};

export type NavSubItem = {
  href: string;
  label: string;
  /** breadcrumb 제목 — 메뉴 라벨과 다를 때(예: 행동형 메뉴 vs 컬렉션 IA) 지정 */
  breadcrumbLabel?: string;
  icon?: LucideIcon;
  badge?: number | string;
  description?: string;
  locked?: boolean;
};

export type NavGroup = {
  label: string;
  caption?: string;
  items: NavItem[];
};

/** 단일 역할 — 플래너 전용 앱이므로 student만 유지 */
export type Role = 'student';

/** 풀림 플래너 섹션 — 다중 시간표 IA */
export const plannerSection: NavSubItem[] = [
  { href: '/planner',            label: '홈',          icon: Home,     description: '활성 플래너 — 일·주·월 시간표' },
  { href: '/planner/manage',     label: '시간표 관리', icon: Wrench,   description: '내 시간표 N개 — 새로 만들기·수정·삭제' },
  // 루틴은 pullim-api 영속(R3b 전환 완료) — prod 게이트(ROUTINE_ENABLED) off면 잠금 표시가 아니라 항목 자체를 제외(라우트 redirect와 일관)
  ...(ROUTINE_ENABLED
    ? [{ href: '/planner/routine', label: '루틴 만들기', breadcrumbLabel: '루틴', icon: Repeat2, description: '반복하는 행동을 등록·관리 — 새 시간표 만들 때 골라 적용' } satisfies NavSubItem]
    : []),
  // 성장 리포트는 soft open(07-10)까지 BE 미준비 — off면 항목 자체를 제외(라우트 redirect와 일관, 온보딩 "출시 예정" 카드로만 예고)
  ...(REPORTS_ENABLED
    ? [{ href: '/planner/reports', label: '성장 리포트', icon: FileText, description: '일·주·월 회고 + 부모 공유' } satisfies NavSubItem]
    : []),
  { href: '/planner/share',      label: '공유',        icon: Share2,   description: '학습 인증 공유 — 친구 피드 + 인증 카드' },
  { href: '/planner?help=1',     label: '매뉴얼',      icon: BookOpen, description: '5분 사용법 가이드 — 첫 화면에서 모달로 열림' },
];

/** 도메인 — 플래너 단일 */
export const studentDomains: NavItem[] = [
  {
    href: '/planner', label: '풀림 플래너', icon: CalendarClock,
    description: 'AI 시간 블록 학습 계획',
    children: plannerSection,
  },
];

/** 호환용 — 단일 그룹 구조 */
export const studentNav: NavGroup[] = [
  { label: '', items: [...studentDomains] },
];

export function navForRole(_role: Role): NavGroup[] {
  return studentNav;
}

/**
 * 모바일 하단 탭 — 플래너 4 섹션 (홈 / 관리 / 리포트 / 공유).
 * OI-1 확정(2026-06-24): '소개/안내'는 하단탭에서 빼고 프로필 메뉴(헤더 ProfileMenu)로 내림 → 공유 승격.
 * 리포트 탭은 REPORTS_ENABLED 게이트 — off면 3탭(홈/관리/공유).
 */
export const studentBottomTabs = [
  { href: '/planner',        label: '홈',      icon: Home,     matchPrefix: ['/', '/planner'] },
  { href: '/planner/manage', label: '관리',    icon: Wrench,   matchPrefix: ['/planner/manage'] },
  ...(REPORTS_ENABLED
    ? [{ href: '/planner/reports', label: '리포트', icon: FileText, matchPrefix: ['/planner/reports'] } as const]
    : []),
  { href: '/planner/share',  label: '공유',    icon: Share2,   matchPrefix: ['/planner/share'] },
] as const;

/** 현재 pathname이 어떤 섹션 안에 있는지 — sidebar swap 판단 */
export function findActiveSection(pathname: string, role: Role): NavItem | undefined {
  const nav = navForRole(role);
  for (const group of nav) {
    for (const item of group.items) {
      if (!item.children) continue;
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        return item;
      }
    }
  }
  return undefined;
}

/** 라우트 → 활성 NavItem 찾기 */
export function findActiveNav(pathname: string, role: Role): NavItem | undefined {
  const nav = navForRole(role);
  for (const group of nav) {
    for (const item of group.items) {
      if (pathname === item.href) return item;
    }
  }
  let best: NavItem | undefined;
  let bestLen = 0;
  for (const group of nav) {
    for (const item of group.items) {
      if (pathname.startsWith(item.href + '/') && item.href.length > bestLen) {
        best = item;
        bestLen = item.href.length;
      }
    }
  }
  return best;
}

/** 라우트 → breadcrumb (도메인 → 세부 페이지 추적) */
export function buildBreadcrumb(pathname: string, role: Role): { label: string; href?: string }[] {
  const nav = navForRole(role);
  const root = { label: '풀림 플래너', href: '/' };
  const trail: { label: string; href?: string }[] = [root];

  if (pathname === root.href) return trail;

  // 1. 최상위 도메인 (가장 긴 prefix 매칭)
  let domainItem: NavItem | undefined;
  for (const group of nav) {
    for (const item of group.items) {
      if (item.href === root.href) continue;
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        if (!domainItem || item.href.length > domainItem.href.length) {
          domainItem = item;
        }
      }
    }
  }
  if (!domainItem) return trail;
  // root와 domain 라벨이 같으면 중복 push 회피 (단일 도메인 앱)
  if (domainItem.label !== trail[0].label) {
    trail.push({ label: domainItem.label, href: domainItem.href });
  }
  if (pathname === domainItem.href) return trail;

  // 2. 도메인 children prefix 매칭 → 깊이 순 정렬
  const candidates: NavSubItem[] = [...(domainItem.children ?? [])];
  const seen = new Set<string>([domainItem.href]);
  const matched: NavSubItem[] = [];
  for (const c of candidates) {
    if (seen.has(c.href)) continue;
    if (pathname === c.href || pathname.startsWith(c.href + '/')) {
      seen.add(c.href);
      matched.push(c);
    }
  }
  matched.sort((a, b) => a.href.length - b.href.length);
  for (const m of matched) {
    trail.push({ label: m.breadcrumbLabel ?? m.label, href: m.href });
  }

  return trail;
}
