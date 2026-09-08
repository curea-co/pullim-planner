# 플래너 셸·홈 PUDS 리프레시 구현 계획

> ⚠️ **2026-09-04 — 셸 레일·탭바 축 폐기 (PR #236).** 사용자 지시로 셸 정본이 형제 앱
> PUDS 셸 킷 → pullim-web `/os` 로 바뀌었다. `md` 64px 축약 · `lg` 접힘 68px · 레일 경계
> 28px 원형 셰브론 · bottom-nav 모바일 전용은 더 이상 완료 기준이 아니다.
> 무엇이 무엇으로 대체됐는지는 대응 spec 문서 머리의 표를 볼 것 —
> `proc/spec/2026-07-06_shell-home-puds-refresh.md`.


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) 구문으로 추적.

**Goal:** 플래너 사이드바를 형제 앱(문제Q·입시코치·라이팅코치) 공통 PUDS 레일(플랫 리스트 + mono 눈썹 + 접기 토글)로 재편하고, 홈 상단에 순수 CSS 3D 그라디언트 히어로를 추가한다.

**Architecture:** `apps/planner` FE 단독(모노레포 규칙: FE/BE 혼합 금지). 사이드바는 `plannerSection` 플랫 렌더로 재작성, 접기 상태는 신규 `useRailCollapse` hook(`localStorage['puds-rail-collapsed']`)이 소유하고 `AppShell`(클라이언트 전환)이 소비. 히어로는 `planner-home` feature 내부 컴포넌트 2개(패널 + 3D 장식) + `globals.css` 키프레임 — 외부 라이브러리 0.

**Tech Stack:** Next.js 16(App Router) · React 19 · Tailwind v4 · Jest+RTL · lucide-react. 애니메이션 라이브러리 추가 금지.

**Spec:** [proc/spec/2026-07-06_shell-home-puds-refresh.md](../spec/2026-07-06_shell-home-puds-refresh.md)

## Global Constraints

- **FE 단독 PR** — `apps/planner/` 밖(root·backend·packages) 수정 금지. `apps/planner/package.json`·`next.config.ts`·`tsconfig.json` 수정 금지(의존성 추가 불가).
- **형제 앱 정합 값(verbatim)**: localStorage 키 `puds-rail-collapsed`(값 `'1'`/`'0'`) · lg 레일 펼침 `248px` ↔ 접힘 `68px` · md compact `64px`(기존 `md:w-16` 유지) · 아이템 `rounded-[11px]` `gap-[11px]` · 활성 3px 좌측 액센트 바 + `--color-primary-50` 틴트 + `--color-action-primary` semibold · 눈썹 `font-mono text-[10px] uppercase tracking-[0.16em]` · 토글 버튼 `h-7 w-7` 원형, 접힘 시 셰브론 `rotate-180` · 폭 전환 `transition-[width] duration-200` · 콘텐츠 `max-w-[1180px]`.
- **3D는 순수 CSS**: `[perspective:1100px]` + `[transform-style:preserve-3d]` + `translateZ` 깊이. 틸트는 부모 스택만 `transform` 키프레임, 카드 플로트는 `translate` 속성 키프레임(자식 `transform`을 덮지 않기 위함 — 라이팅코치 검증 기법). `motion-reduce` 시 정적 틸트. 장식 전체 `aria-hidden` + `hidden sm:block`.
- 사용자 노출 텍스트 한국어 하드코딩(i18n 미도입) · Tailwind만(인라인 style 금지 — 단 3D 카드의 개별 transform은 Tailwind arbitrary `[transform:...]`로) · shadcn semantic 토큰 우선.
- 커밋 전: `bun --filter @pullim-planner/planner typecheck && lint && test` 통과.
- 각 커밋 트레일러: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` + `Claude-Session: https://claude.ai/code/session_011c1vUTFHb2q26SVN9VxV3H`

---

### Task 1: 사이드바 플랫 재편 (PUDS 레일)

**Files:**
- Modify: `apps/planner/components/shell/app-sidebar.tsx` (전면 재작성)
- Modify: `apps/planner/components/shell/mobile-drawer.tsx` (role 전달 제거)
- Modify: `apps/planner/components/shell/app-header.tsx` (role prop 제거 — MobileDrawer에만 쓰였음)
- Modify: `apps/planner/components/shell/app-shell.tsx` (호출부 최소 수정 — Task 2에서 전면 재작성 예정)
- Test: `apps/planner/__tests__/shell/app-sidebar.test.tsx` (신규)

**Interfaces:**
- Consumes: `plannerSection: NavSubItem[]` (`./nav-config` — 변경 없음), `cn` (`@/lib/utils`)
- Produces: `AppSidebar({ onNavigate?, className?, compact?, collapsed? })` — **`role` prop 제거**, `collapsed?: boolean` 신설(Task 2가 소비). `AppHeader()` — role prop 제거.

**참고:** `nav-config.ts`의 `studentDomains`/`findActiveSection`/`navForRole`은 breadcrumb·bottom-nav가 계속 쓰므로 **수정 금지**. `AppSidebar`만 소비 경로를 `plannerSection` 플랫으로 바꾼다. `REPORTS_ENABLED`/`ROUTINE_ENABLED` 조건부 항목은 `plannerSection` 배열 안에서 이미 처리돼 있어 추가 작업 없음.

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/planner/__tests__/shell/app-sidebar.test.tsx`

```tsx
/**
 * 사이드바 플랫 PUDS 레일 — 형제 앱(Q·코치) 공통 패턴 회귀 방지.
 */
jest.mock('next/navigation', () => ({
  usePathname: () => '/planner/manage/abc/edit',
}));

import { render, screen } from '@testing-library/react';
import { AppSidebar } from '@/components/shell/app-sidebar';

describe('AppSidebar (플랫 PUDS 레일)', () => {
  it('mono 눈썹 라벨과 핵심 항목을 플랫하게 렌더한다', () => {
    render(<AppSidebar />);
    expect(screen.getByText('풀림 플래너')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '홈' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '시간표 관리' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공유' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '매뉴얼' })).toBeInTheDocument();
  });

  it('최장 prefix 매치 항목에만 aria-current를 단다', () => {
    render(<AppSidebar />);
    // pathname=/planner/manage/abc/edit → '/planner'와 '/planner/manage' 둘 다 prefix지만 긴 쪽이 활성
    expect(screen.getByRole('link', { name: '시간표 관리' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '홈' })).not.toHaveAttribute('aria-current');
  });

  it('compact(아이콘 전용)에선 눈썹·라벨을 숨기고 title 접근명으로 대체한다', () => {
    render(<AppSidebar compact />);
    expect(screen.queryByText('풀림 플래너')).not.toBeInTheDocument();
    // 라벨 텍스트 노드는 없지만 title 덕에 접근명은 유지
    expect(screen.getByRole('link', { name: '시간표 관리' })).toBeInTheDocument();
  });

  it('collapsed(lg 접힘)에서도 아이콘 전용으로 렌더한다', () => {
    render(<AppSidebar collapsed />);
    expect(screen.queryByText('풀림 플래너')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '홈' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `bun --filter @pullim-planner/planner test -- __tests__/shell/app-sidebar.test.tsx`
Expected: FAIL — `role` prop 필수라 TS/렌더 에러 또는 '풀림 플래너' 눈썹 부재.

- [ ] **Step 3: `app-sidebar.tsx` 전면 재작성**

```tsx
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
```

- [ ] **Step 4: 호출부 role 제거 (3개 파일 최소 수정)**

`mobile-drawer.tsx` — 시그니처와 사용부에서 role 제거:
```tsx
// before: export function MobileDrawer({ role }: { role: Role }) {
export function MobileDrawer() {
// before: <AppSidebar role={role} onNavigate={() => setOpen(false)} className="flex-1" />
<AppSidebar onNavigate={() => setOpen(false)} className="flex-1" />
```
`Role` import가 미사용이 되면 함께 제거.

`app-header.tsx` — role prop 제거(MobileDrawer 전달용이었음):
```tsx
// before: export function AppHeader({ role }: { role: Role }) {
export function AppHeader() {
// before: <MobileDrawer role={role} />
<MobileDrawer />
```
`type Role` import 미사용 시 제거.

`app-shell.tsx` — 호출부만 최소 수정(구조는 Task 2에서):
```tsx
// before: <AppHeader role={role} />
<AppHeader />
// before: <AppSidebar role={role} className="hidden lg:flex" />
<AppSidebar className="hidden lg:flex" />
// before: <AppSidebar role={role} compact className="flex lg:hidden" />
<AppSidebar compact className="flex lg:hidden" />
```
`<Breadcrumb role={role} />`은 그대로(breadcrumb는 role 유지) — `AppShell`의 `role` prop도 그대로.

- [ ] **Step 5: 테스트·게이트 통과 확인**

Run: `bun --filter @pullim-planner/planner test && bun --filter @pullim-planner/planner typecheck && bun --filter @pullim-planner/planner lint`
Expected: 전체 PASS (기존 스위트 포함).

- [ ] **Step 6: Commit**

```bash
git add apps/planner/components/shell/app-sidebar.tsx apps/planner/components/shell/mobile-drawer.tsx apps/planner/components/shell/app-header.tsx apps/planner/components/shell/app-shell.tsx apps/planner/__tests__/shell/app-sidebar.test.tsx
git commit -m "feat(fe): 사이드바 플랫 PUDS 레일 재편 — mono 눈썹 + 최장 prefix 활성 + collapsed 지원"
```

---

### Task 2: 접기 토글 + 레이아웃 1180

**Files:**
- Create: `apps/planner/components/shell/use-rail-collapse.ts`
- Modify: `apps/planner/components/shell/app-shell.tsx` (클라이언트 전환 + 토글 + max-w)
- Test: `apps/planner/__tests__/shell/use-rail-collapse.test.tsx` (신규)

**Interfaces:**
- Consumes: Task 1의 `AppSidebar({ collapsed?, compact?, className? })`
- Produces: `useRailCollapse(): { collapsed: boolean; toggle: () => void }` + `RAIL_KEY = 'puds-rail-collapsed'` export

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/planner/__tests__/shell/use-rail-collapse.test.tsx`

```tsx
import { renderHook, act } from '@testing-library/react';
import { useRailCollapse, RAIL_KEY } from '@/components/shell/use-rail-collapse';

describe('useRailCollapse', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('기본은 펼침(false), 토글하면 접히고 localStorage에 저장한다', () => {
    const { result } = renderHook(() => useRailCollapse());
    expect(result.current.collapsed).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(true);
    expect(localStorage.getItem(RAIL_KEY)).toBe('1');

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(false);
    expect(localStorage.getItem(RAIL_KEY)).toBe('0');
  });

  it("저장된 '1'을 마운트 시 복원한다", () => {
    localStorage.setItem(RAIL_KEY, '1');
    const { result } = renderHook(() => useRailCollapse());
    expect(result.current.collapsed).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `bun --filter @pullim-planner/planner test -- __tests__/shell/use-rail-collapse.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: `use-rail-collapse.ts` 구현**

```ts
'use client';

import { useEffect, useState } from 'react';

/** 형제 앱(Q·입시·라이팅 코치) 공통 키 — 접기 상태를 서비스 간 일관되게 영속 */
export const RAIL_KEY = 'puds-rail-collapsed';

/**
 * lg+ 사이드바 접기 토글 상태. SSR 안전을 위해 초기값 false,
 * 마운트 후 localStorage에서 복원(형제 앱 공통 패턴).
 */
export function useRailCollapse() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(RAIL_KEY) === '1') setCollapsed(true);
    } catch {
      /* private mode 등 storage 접근 실패 무시 */
    }
  }, []);

  const toggle = () =>
    setCollapsed(c => {
      const next = !c;
      try {
        localStorage.setItem(RAIL_KEY, next ? '1' : '0');
      } catch {
        /* 무시 */
      }
      return next;
    });

  return { collapsed, toggle };
}
```

- [ ] **Step 4: `app-shell.tsx` 재작성 (클라이언트 전환 + 토글 버튼 + 1180)**

```tsx
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
 * - 모바일 (xs/sm): 헤더(햄버거) + 본문 + 하단 탭
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
```

- [ ] **Step 5: 테스트·게이트 통과 확인**

Run: `bun --filter @pullim-planner/planner test && bun --filter @pullim-planner/planner typecheck && bun --filter @pullim-planner/planner lint`
Expected: 전체 PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/planner/components/shell/use-rail-collapse.ts apps/planner/components/shell/app-shell.tsx apps/planner/__tests__/shell/use-rail-collapse.test.tsx
git commit -m "feat(fe): 사이드바 접기 토글(puds-rail-collapsed 영속) + 콘텐츠 1180px — 형제 앱 정합"
```

---

### Task 3: 홈 히어로 + 순수 CSS 3D

**Files:**
- Create: `apps/planner/components/features/planner-home/components/home-hero.tsx`
- Create: `apps/planner/components/features/planner-home/components/hero-motion-3d.tsx`
- Modify: `apps/planner/app/globals.css` (파일 끝에 키프레임 추가)
- Modify: `apps/planner/components/features/planner-home/presenters/HomePresenter.tsx` (히어로 삽입)
- Test: `apps/planner/__tests__/planner/home-hero.test.tsx` (신규)

**Interfaces:**
- Consumes: `HomePresenter` 기존 props(`examName: string`, `dday: number`, `daySummary: { done: number; total: number }`, `weekMeta: { totalHours: number; completedHours: number }`) — **Container 변경 없음**.
- Produces: `HomeHero({ examName, dday, daySummary, weekMeta })`, `HeroMotion3D()` (props 없음, 순수 장식).

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/planner/__tests__/planner/home-hero.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { HomeHero } from '@/components/features/planner-home/components/home-hero';

const base = {
  examName: '수능',
  dday: 134,
  daySummary: { done: 3, total: 5 },
  weekMeta: { totalHours: 12, completedHours: 4 },
};

describe('HomeHero', () => {
  it('시험명·D-Day·오늘/주간 스탯을 노출한다', () => {
    render(<HomeHero {...base} />);
    expect(screen.getByText('수능')).toBeInTheDocument();
    expect(screen.getByText('D-134')).toBeInTheDocument();
    expect(screen.getByText(/3\/5/)).toBeInTheDocument();
    expect(screen.getByText(/12h/)).toBeInTheDocument();
  });

  it('D-0은 D-DAY로 표기한다', () => {
    render(<HomeHero {...base} dday={0} />);
    expect(screen.getByText('D-DAY')).toBeInTheDocument();
  });

  it('블록·주간 계획이 없으면 스탯 라인을 감춘다', () => {
    render(
      <HomeHero {...base} daySummary={{ done: 0, total: 0 }} weekMeta={{ totalHours: 0, completedHours: 0 }} />,
    );
    expect(screen.queryByText(/블록 완료/)).not.toBeInTheDocument();
    expect(screen.queryByText(/이번 주/)).not.toBeInTheDocument();
  });

  it('3D 장식은 aria-hidden으로 보조기기에서 숨긴다', () => {
    const { container } = render(<HomeHero {...base} />);
    expect(container.querySelector('[data-hero-3d][aria-hidden="true"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `bun --filter @pullim-planner/planner test -- __tests__/planner/home-hero.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: `hero-motion-3d.tsx` 구현 (순수 CSS 3D 장식)**

```tsx
import { cn } from '@/lib/utils';

/**
 * 홈 히어로 3D 장식 — 형제 앱(Q·입시·라이팅 코치) 공통 기법의 플래너 버전.
 * 시간블록 미니 카드 3장을 translateZ 깊이별로 쌓고 부모 스택만 틸트 진동.
 * 순수 CSS(라이브러리 0): 틸트=부모 transform 키프레임, 플로트=카드 translate 키프레임
 * (translate는 transform과 독립 속성이라 카드의 정적 3D transform을 덮지 않는다).
 */
export function HeroMotion3D() {
  return (
    <div
      aria-hidden
      data-hero-3d
      className="absolute inset-y-0 right-0 hidden w-[44%] max-w-[320px] [perspective:1100px] sm:block"
    >
      <div className="absolute inset-0 grid place-items-center [transform-style:preserve-3d] motion-safe:animate-[planner-hero-tilt_10s_ease-in-out_infinite] motion-reduce:[transform:rotateY(-14deg)_rotateX(6deg)]">
        <BlockCard
          time="09:00"
          bar="w-10"
          className="opacity-50 [transform:translateZ(-46px)_translateX(-30px)_translateY(-8px)_rotate(-7deg)] motion-safe:animate-[planner-hero-float_7s_ease-in-out_infinite]"
        />
        <BlockCard
          time="14:00"
          bar="w-14"
          className="opacity-80 [transform:translateZ(0px)] motion-safe:animate-[planner-hero-float_7s_ease-in-out_-2.3s_infinite]"
        />
        <BlockCard
          time="19:30"
          bar="w-12"
          checked
          className="[transform:translateZ(48px)_translateX(26px)_translateY(10px)_rotate(6deg)] motion-safe:animate-[planner-hero-float_7s_ease-in-out_-4.6s_infinite]"
        />
      </div>
    </div>
  );
}

/** 시간블록 미니 카드 — 유리질감(글래스) 패널 + 시간 라벨 + 과목 바 */
function BlockCard({
  time, bar, checked, className,
}: {
  time: string;
  bar: string;
  checked?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'absolute h-[76px] w-[132px] rounded-xl border border-white/25 bg-white/10 p-3 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.45)] backdrop-blur-[2px] [transform-style:preserve-3d]',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-medium tracking-wide text-white/80">{time}</span>
        {checked && <span className="bg-pullim-lemon h-2 w-2 rounded-full" />}
      </div>
      <div className="mt-2.5 h-1.5 w-16 rounded-full bg-white/30" />
      <div className={cn('mt-1.5 h-1.5 rounded-full', bar, checked ? 'bg-pullim-lemon' : 'bg-white/50')} />
    </div>
  );
}
```

- [ ] **Step 4: `home-hero.tsx` 구현 (그라디언트 패널)**

```tsx
import { HeroMotion3D } from './hero-motion-3d';

type Props = {
  examName: string;
  dday: number;
  daySummary: { done: number; total: number };
  weekMeta: { totalHours: number; completedHours: number };
};

/**
 * 홈 히어로 — D-Day 밴드의 승격. 형제 앱 공통 그라디언트 히어로의 컴팩트 버전
 * (매일 쓰는 달력 대시보드라 세로 공간을 아낀다). 3D 장식은 absolute라 높이에 영향 없음.
 */
export function HomeHero({ examName, dday, daySummary, weekMeta }: Props) {
  const ddayLabel = dday === 0 ? 'D-DAY' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`;
  const showDay = daySummary.total > 0;
  const showWeek = weekMeta.totalHours > 0;

  return (
    <section
      aria-label="학습 현황 요약"
      className="from-pullim-blue-700 to-pullim-blue-900 relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br px-5 py-5 text-white sm:px-6"
    >
      <HeroMotion3D />
      <div className="relative z-10">
        <div className="flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.16em] text-white/70 uppercase">
          <span aria-hidden className="bg-pullim-lemon h-1.5 w-1.5 rounded-full" />
          Pullim Planner
        </div>
        <h2 className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">
          <span className="mr-2 inline-block max-w-[14ch] truncate align-bottom">{examName}</span>
          <span className="text-pullim-lemon align-bottom">{ddayLabel}</span>
        </h2>
        {(showDay || showWeek) && (
          <p className="mt-1 text-[13px] text-white/80">
            {showDay && (
              <>
                오늘 <strong className="font-bold text-white">{daySummary.done}/{daySummary.total}</strong> 블록 완료
              </>
            )}
            {showDay && showWeek && <span className="mx-1.5 opacity-50">·</span>}
            {showWeek && (
              <>
                이번 주 계획 <strong className="font-bold text-white">{weekMeta.totalHours}h</strong>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: `globals.css` 파일 끝에 키프레임 추가**

```css
/* ═══ 홈 히어로 3D — 형제 앱(Q·코치) 공통 기법. 틸트=부모 transform, 플로트=카드 translate(독립 속성) ═══ */
@keyframes planner-hero-tilt {
  0%, 100% { transform: rotateY(-20deg) rotateX(9deg); }
  50%      { transform: rotateY(16deg) rotateX(2deg); }
}
@keyframes planner-hero-float {
  0%, 100% { translate: 0 0; }
  50%      { translate: 0 -10px; }
}
```

- [ ] **Step 6: `HomePresenter.tsx`에 히어로 삽입**

import 추가:
```tsx
import { HomeHero } from '../components/home-hero';
```
return 블록의 `<DDayHeaderBand …/>` 바로 다음, `<BurnoutThresholdBanner …/>` 앞에:
```tsx
<DDayHeaderBand dday={dday} examName={examName} />
<HomeHero examName={examName} dday={dday} daySummary={daySummary} weekMeta={weekMeta} />
<BurnoutThresholdBanner score={burnoutScore} />
```

> **리뷰 반영 (2026-07-07, PR #123 라운드 2)**: 위 배치는 시험명·D-Day 이중 노출로 지적됨
> → `DDayHeaderBand` 렌더·컴포넌트를 제거하고 히어로가 완전 흡수(직전 구간 권유 카피를
> 히어로 안 `role="status"` 라인으로, `shouldShowDDayHeaderBand` 조건 보존). 스펙 결정 3 개정판 참조.

- [ ] **Step 7: 테스트·게이트 통과 확인**

Run: `bun --filter @pullim-planner/planner test && bun --filter @pullim-planner/planner typecheck && bun --filter @pullim-planner/planner lint`
Expected: 전체 PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/planner/components/features/planner-home/components/home-hero.tsx apps/planner/components/features/planner-home/components/hero-motion-3d.tsx apps/planner/app/globals.css apps/planner/components/features/planner-home/presenters/HomePresenter.tsx apps/planner/__tests__/planner/home-hero.test.tsx
git commit -m "feat(fe): 홈 그라디언트 히어로 + 순수 CSS 3D 시간블록 카드 — 형제 앱 히어로 정합"
```

---

## 마무리 (컨트롤러 작업)

- `bun --filter @pullim-planner/planner build` 통과 확인.
- dev(3030) 스모크: 펼침/접힘 사이드바 + 히어로 3D 스크린샷.
- Orchestration 체크리스트: `nav-config.ts` href ↔ 라우트 정합(변경 없음이므로 확인만), 권위 문서 IA 어긋남 없음.
- PR: `feat/shell-home-puds-refresh` → `dev`. Codex Review 통과 후 머지.
