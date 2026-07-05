# pullim-planner → PUDS 디자인 시스템 정합 — 구현계획(Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 풀림 플래너(`apps/planner`)를 라이팅/어드미션 코치와 동일한 PUDS `pullim-os` 디자인 위에서 렌더되게 한다 — 코치 블루(hue-258)·중립·radius·shadow·셸 합성 패리티.

**Architecture:** PUDS canonical 토큰(`_base.css`+`pullim-os.css`)을 vendored로 반입하고, `globals.css`를 **이름 보존 브릿지**로 재작성한다(기존 토큰/유틸 이름 유지, 값만 PUDS로 재지정 → 컴포넌트 파일 편집 0). 셸 5종은 코치 `DashboardShell`/`OsRail`/`OsTabbar` 합성을 **손으로 미러링**(레지스트리 미설치). 라이트 단일(dark 휴면).

**Tech Stack:** Next.js 16(App Router) · Tailwind CSS v4 · shadcn/ui 로컬 프리미티브 · Jest+RTL · bun workspace.

## Global Constraints

- **FE 단독 · 단일 PR**: `apps/planner`만 변경. 리포 최상위 규칙("FE/BE 혼합 금지") 준수. (루트 [CLAUDE.md](../../CLAUDE.md))
- **DS npm 패키지/레지스트리 컴포넌트 미설치**: `@pullim/design-system`·`@puds/*` import 금지. 토큰은 vendored CSS로만 소비.
- **컴포넌트 파일 테마 편집 0**: 토큰 스왑은 오직 `globals.css` + `app/tokens/*` 로. `pullim-*`/shadcn 유틸 이름은 전부 보존.
- **권위 토큰 원본**: `../pullim-design-system/packages/tokens/{_base.css,pullim-os.css}` (코치 vendored 사본과 byte-identical). 값 임의 변경 금지 — verbatim 복사(단 폰트 `@import` 라인만 제거).
- **테마 활성화 필수**: `<html data-theme="pullim-os">`. 미지정 시 primary 램프 미적용(회귀).
- **커밋 전 게이트**(각 태스크): `bun --filter @pullim-planner/planner typecheck` · `lint` · `test` 그린.
- **명령 prefix**: 모든 스크립트는 리포 루트에서 `bun --filter @pullim-planner/planner <script>`.

## 파일 구조 (생성/수정)

| 파일 | 책임 | 액션 |
|---|---|---|
| `apps/planner/app/tokens/_base.css` | PUDS CUDS 기반 토큰(gray/status/spacing/surface/text/border, 리셋, `.kr-*`) | 생성(vendored) |
| `apps/planner/app/tokens/pullim-os.css` | `[data-theme="pullim-os"]` primary 램프·lemon·radius·density·shadow | 생성(vendored) |
| `apps/planner/app/globals.css` | 이름 보존 브릿지(@theme inline) + 토큰 import | 재작성 |
| `apps/planner/app/layout.tsx` | `data-theme="pullim-os"` 정적 지정 + themeColor | 수정 |
| `apps/planner/components/shell/app-header.tsx` | 헤더 60px + 코치 브랜드(풀림 17px + 플래너 pill) | 수정 |
| `apps/planner/components/shell/app-shell.tsx` | 콘텐츠 max-w 1180 + 셸 합성 정렬 | 수정 |
| `apps/planner/components/shell/bottom-nav.tsx` | OsTabbar 메트릭 미러 | 수정 |
| `apps/planner/__tests__/globals-token-coverage.test.ts` | globals가 참조 토큰 이름의 superset임을 보증 | 생성 |
| `apps/planner/CLAUDE.md` | "DS 미사용 별 트랙" 서술을 vendored-토큰-yes/레지스트리-no로 갱신 | 수정 |

---

### Task 1: PUDS 토큰 파일 vendored 반입

**Files:**
- Create: `apps/planner/app/tokens/_base.css`
- Create: `apps/planner/app/tokens/pullim-os.css`

**Interfaces:**
- Produces: `:root` 전역 토큰 `--color-gray-{50..950}`, `--surface-canvas/-raised/-sunken`, `--text-primary/-secondary/-tertiary`, `--border-subtle/-default/-strong`, `--font-sans-kr`; `[data-theme="pullim-os"]` 토큰 `--color-primary-{50..950}`, `--color-secondary-500`(lemon), `--color-action-primary`, `--radius-{xs..2xl}`, `--shadow-{sm,md,lg,xl}`, `--color-danger-600` 등. Task 2가 이 이름들을 소비.

- [ ] **Step 1: 원본을 verbatim 복사**

Run (리포 루트에서):
```bash
mkdir -p apps/planner/app/tokens
cp ../pullim-design-system/packages/tokens/_base.css apps/planner/app/tokens/_base.css
cp ../pullim-design-system/packages/tokens/pullim-os.css apps/planner/app/tokens/pullim-os.css
```

- [ ] **Step 2: `_base.css`에서 폰트 CDN `@import` 라인 제거 (Turbopack dev 500 회피)**

`apps/planner/app/tokens/_base.css` 최상단에 `@import url(...pretendard...)` 형태의 라인이 있으면 삭제한다(플래너 `globals.css`가 이미 Pretendard를 CDN `@import`로 로드 — 중복·dev 500 방지). 파일 나머지(`:root` 토큰, `@layer base` 리셋, `.kr-*`, container, reduced-motion, high-contrast)는 그대로 둔다.

검증: `grep -n "@import" apps/planner/app/tokens/_base.css` → 폰트 CDN import 라인이 없어야 함(0건 또는 폰트 아닌 것만).

- [ ] **Step 3: 복사 정합 확인 (폰트 라인 제외 동일)**

Run:
```bash
diff <(grep -v "cdn.jsdelivr" ../pullim-design-system/packages/tokens/pullim-os.css) apps/planner/app/tokens/pullim-os.css && echo "pullim-os OK"
```
Expected: `pullim-os OK` (pullim-os.css는 폰트 import가 없으므로 완전 동일).

- [ ] **Step 4: Commit**

```bash
git add apps/planner/app/tokens/
git commit -m "feat(planner): vendor PUDS pullim-os tokens (_base + pullim-os)"
```

---

### Task 2: `globals.css` 이름 보존 브릿지 재작성

**Files:**
- Modify: `apps/planner/app/globals.css` (전체 재작성)
- Test: `apps/planner/__tests__/globals-token-coverage.test.ts`

**Interfaces:**
- Consumes: Task 1의 `_base.css`/`pullim-os.css` 토큰.
- Produces: 기존과 동일한 이름 집합의 Tailwind v4 유틸 — `bg-background`/`text-foreground`/`bg-card`/`ring-*`/`border-border`/`bg-primary` + `pullim-blue-{50..950}`/`pullim-slate-{0..950}`/`pullim-lemon*`/`pullim-success|warn|danger*`/`pullim-heat-*`/`pullim-lvl-*`/`pullim-violet|teal-*` + `rounded-{xs..4xl,pill}` + `shadow-pullim-{xs..lg,glow}`. 값만 PUDS로 재지정.

- [ ] **Step 1: 토큰 커버리지 테스트 작성 (실패 예상)**

`apps/planner/__tests__/globals-token-coverage.test.ts` 생성 — globals가 코드에서 참조하는 핵심 토큰 이름을 모두 정의하는지 보증(이름 누락 = 유틸 무효화 회귀 가드).

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(__dirname, '../app/globals.css'), 'utf8');

// globals.css가 반드시 정의해야 하는 @theme 토큰 이름(코드가 유틸로 참조).
const REQUIRED = [
  // shadcn 시맨틱
  '--color-background', '--color-foreground', '--color-card', '--color-popover',
  '--color-primary', '--color-primary-foreground', '--color-secondary',
  '--color-muted', '--color-muted-foreground', '--color-accent', '--color-accent-foreground',
  '--color-destructive', '--color-border', '--color-input', '--color-ring',
  '--color-chart-1', '--color-chart-5',
  '--color-sidebar', '--color-sidebar-primary', '--color-sidebar-accent', '--color-sidebar-ring',
  // pullim 브랜드 블루 램프
  '--color-pullim-blue-50', '--color-pullim-blue-500', '--color-pullim-blue-600',
  '--color-pullim-blue-700', '--color-pullim-blue-950',
  // pullim 슬레이트 램프
  '--color-pullim-slate-0', '--color-pullim-slate-50', '--color-pullim-slate-100',
  '--color-pullim-slate-200', '--color-pullim-slate-500', '--color-pullim-slate-700',
  '--color-pullim-slate-900',
  // 시맨틱 상태
  '--color-pullim-success', '--color-pullim-success-bg', '--color-pullim-success-strong',
  '--color-pullim-warn', '--color-pullim-warn-bg', '--color-pullim-warn-cta-bg',
  '--color-pullim-danger', '--color-pullim-danger-bg',
  // 레몬 / 보조 / 히트 / 레벨
  '--color-pullim-lemon', '--color-pullim-lemon-soft', '--color-pullim-lemon-ink',
  '--color-pullim-violet-600', '--color-pullim-teal-600',
  '--color-pullim-heat-0', '--color-pullim-heat-5',
  '--color-pullim-lvl-1', '--color-pullim-lvl-5',
  // radius / shadow / font
  '--radius-xs', '--radius-md', '--radius-lg', '--radius-xl', '--radius-pill',
  '--shadow-pullim-xs', '--shadow-pullim-sm', '--shadow-pullim-md', '--shadow-pullim-lg', '--shadow-pullim-glow',
  '--font-sans', '--font-mono',
];

describe('globals.css token coverage', () => {
  it.each(REQUIRED)('defines %s', (name) => {
    expect(css).toContain(name);
  });

  it('imports PUDS token files', () => {
    expect(css).toContain('./tokens/_base.css');
    expect(css).toContain('./tokens/pullim-os.css');
  });

  it('does not reintroduce the pre-PUDS brand blue #3B6FF6 as primary', () => {
    // primary 라인에 옛 브라이트 블루가 하드코딩되지 않아야 함(회귀 가드)
    const primaryLine = css.split('\n').find((l) => l.includes('--primary:')) ?? '';
    expect(primaryLine).not.toContain('#3B6FF6');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `bun --filter @pullim-planner/planner test globals-token-coverage`
Expected: FAIL — globals가 아직 tokens를 import하지 않고 `--primary: #3B6FF6`가 남아 있어 실패.

- [ ] **Step 3: `globals.css` 전체 재작성**

`apps/planner/app/globals.css`를 아래로 교체. (핵심 변경: ① tokens import 추가 ② blue 램프→PUDS primary ③ slate 램프→PUDS 중립 hue(286) oklch ④ 시맨틱 surface/border→PUDS ⑤ radius→pullim-os sharp ⑥ shadow→PUDS ink 값 ⑦ lemon→PUDS. 나머지 이름·도메인 애니메이션·`@layer components`·`.dark` 블록은 유지, `.dark` 값만 gray-950 계열로 재테마.)

```css
/* Pretendard — 풀림 기본 본문 서체 (@import는 다른 모든 규칙보다 먼저) */
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
/* PUDS canonical 토큰 — 코치(writing/admissions)와 동일 소비. 값 권위 원본. */
@import "./tokens/_base.css";
@import "./tokens/pullim-os.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* 폰트 */
  --font-sans: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace;
  --font-heading: var(--font-sans);

  /* shadcn 시맨틱 → 풀림 매핑 (값은 아래 :root에서 PUDS 토큰으로 바인딩) */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  /* 풀림 브랜드 블루 — PUDS pullim-os primary 램프(hue-258)로 재지정. 코치와 동일 블루. */
  --color-pullim-blue-50:  var(--color-primary-50);
  --color-pullim-blue-100: var(--color-primary-100);
  --color-pullim-blue-200: var(--color-primary-200);
  --color-pullim-blue-300: var(--color-primary-300);
  --color-pullim-blue-400: var(--color-primary-400);
  --color-pullim-blue-500: var(--color-primary-500);
  --color-pullim-blue-600: var(--color-primary-600);
  --color-pullim-blue-700: var(--color-primary-700);
  --color-pullim-blue-800: var(--color-primary-800);
  --color-pullim-blue-900: var(--color-primary-900);
  --color-pullim-blue-950: var(--color-primary-950);

  /* 풀림 슬레이트 — PUDS 중립 hue(286) oklch 램프. 기존 L 스텝 유지(대비 보존) + PUDS 그레이 family로 정합. */
  --color-pullim-slate-0:   #ffffff;
  --color-pullim-slate-25:  oklch(0.985 0.002 286);
  --color-pullim-slate-50:  oklch(0.968 0.003 286);
  --color-pullim-slate-100: oklch(0.940 0.004 286);
  --color-pullim-slate-200: oklch(0.888 0.006 286);
  --color-pullim-slate-300: oklch(0.808 0.010 286);
  --color-pullim-slate-400: oklch(0.660 0.014 286);
  --color-pullim-slate-500: oklch(0.520 0.016 286);
  --color-pullim-slate-600: oklch(0.410 0.018 286);
  --color-pullim-slate-700: oklch(0.320 0.018 286);
  --color-pullim-slate-800: oklch(0.235 0.016 286);
  --color-pullim-slate-900: oklch(0.175 0.014 286);
  --color-pullim-slate-950: oklch(0.120 0.012 286);

  /* 시맨틱 상태 — 플래너 AA 튠 유지(코치도 도메인 시맨틱은 자체 유지). */
  --color-pullim-success: #12B26B;
  --color-pullim-success-bg: #E6F7EE;
  --color-pullim-success-strong: #0E8C56;
  --color-pullim-warn: #F59E0B;
  --color-pullim-warn-bg: #FEF3DB;
  --color-pullim-warn-cta-bg: #D97706;
  --color-pullim-danger: #E5484D;
  --color-pullim-danger-bg: #FCE9EA;

  /* IRT 난이도 5단계 — 새 블루 램프에 정합 */
  --color-pullim-lvl-1: var(--color-primary-100);
  --color-pullim-lvl-2: var(--color-primary-300);
  --color-pullim-lvl-3: var(--color-primary-400);
  --color-pullim-lvl-4: var(--color-primary-600);
  --color-pullim-lvl-5: var(--color-primary-800);

  /* 레몬 — PUDS pullim-os secondary(lemon) */
  --color-pullim-lemon: var(--color-secondary-500);
  --color-pullim-lemon-soft: oklch(0.97 0.09 116);
  --color-pullim-lemon-ink: oklch(0.45 0.10 116);

  /* 보조 색 — 블록 타입별 아이콘 컨테이너 */
  --color-pullim-violet-50: #F5F3FF;
  --color-pullim-violet-600: #7C3AED;
  --color-pullim-teal-50:   #ECFDF5;
  --color-pullim-teal-600:  #0D9488;

  /* 학습 히트맵 6단계 — 새 블루 램프 정합 */
  --color-pullim-heat-0: var(--color-primary-50);
  --color-pullim-heat-1: var(--color-primary-100);
  --color-pullim-heat-2: var(--color-primary-300);
  --color-pullim-heat-3: var(--color-primary-400);
  --color-pullim-heat-4: var(--color-primary-600);
  --color-pullim-heat-5: var(--color-primary-900);

  /* 라운드 — pullim-os SHARP 스케일 */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 9999px;
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);

  /* 모션 */
  --pullim-duration-fast: 120ms;
  --pullim-duration-base: 200ms;
  --pullim-duration-slow: 320ms;
  --pullim-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --pullim-ease-emphasis: cubic-bezier(0.32, 0.72, 0, 1);

  /* 레이아웃 — 셸 골격 (코치 DashboardShell 정합: 헤더 60 / 콘텐츠 1180) */
  --pullim-header-height-desktop: 60px;
  --pullim-header-height-mobile: 56px;
  --pullim-sidebar-width-full: 240px;
  --pullim-sidebar-width-compact: 64px;
  --pullim-tabbar-height: 64px;
  --pullim-content-maxwidth: 1180px;
  --pullim-content-gutter-desktop: 24px;
  --pullim-content-gutter-mobile: 16px;
  --pullim-fab-offset-bottom: calc(var(--pullim-tabbar-height) + 24px);
  --pullim-viewport-safety-padding: 2rem;
}

:root {
  --radius: 0.5rem; /* 8px — pullim-os md */

  /* 라이트 — PUDS 시맨틱 토큰 바인딩 */
  --background: var(--surface-canvas);
  --foreground: var(--text-primary);
  --card: var(--surface-raised);
  --card-foreground: var(--text-primary);
  --popover: var(--surface-raised);
  --popover-foreground: var(--text-primary);
  --primary: var(--color-primary-600);
  --primary-foreground: #FFFFFF;
  --secondary: var(--surface-sunken);
  --secondary-foreground: var(--text-secondary);
  --muted: var(--surface-sunken);
  --muted-foreground: var(--text-tertiary);
  --accent: var(--color-primary-50);
  --accent-foreground: var(--color-primary-700);
  --destructive: #E5484D;
  --border: var(--border-default);
  --input: var(--border-default);
  --ring: var(--color-primary-600);

  /* 차트 — 블루 램프 톤 */
  --chart-1: var(--color-primary-600);
  --chart-2: var(--color-primary-400);
  --chart-3: var(--color-primary-800);
  --chart-4: var(--color-primary-300);
  --chart-5: var(--color-primary-500);

  /* 사이드바 */
  --sidebar: var(--surface-raised);
  --sidebar-foreground: var(--text-primary);
  --sidebar-primary: var(--color-primary-600);
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: var(--color-primary-50);
  --sidebar-accent-foreground: var(--color-primary-700);
  --sidebar-border: var(--border-default);
  --sidebar-ring: var(--color-primary-600);

  /* 풀림 그림자 — PUDS ink 값(rgba 13,26,31) */
  --shadow-pullim-xs: 0 1px 2px rgba(13, 26, 31, 0.06);
  --shadow-pullim-sm: 0 1px 3px rgba(13, 26, 31, 0.08), 0 1px 2px rgba(13, 26, 31, 0.05);
  --shadow-pullim-md: 0 2px 8px rgba(13, 26, 31, 0.08), 0 2px 4px rgba(13, 26, 31, 0.05);
  --shadow-pullim-lg: 0 12px 40px rgba(3, 98, 218, 0.12), 0 4px 8px rgba(13, 26, 31, 0.05);
  --shadow-pullim-glow: 0 0 0 4px var(--color-primary-a4, rgba(3, 98, 218, 0.15));
}

.dark {
  /* 다크 — 휴면(토글 미배선). PUDS gray-950 베이스로 패리티만 유지. */
  --background: var(--color-gray-950);
  --foreground: var(--color-gray-50);
  --card: var(--color-gray-900);
  --card-foreground: var(--color-gray-50);
  --popover: var(--color-gray-900);
  --popover-foreground: var(--color-gray-50);
  --primary: var(--color-primary-400);
  --primary-foreground: var(--color-primary-950);
  --secondary: var(--color-gray-800);
  --secondary-foreground: var(--color-gray-50);
  --muted: var(--color-gray-800);
  --muted-foreground: var(--color-gray-400);
  --accent: var(--color-primary-900);
  --accent-foreground: var(--color-primary-100);
  --destructive: #E5484D;
  --border: rgba(255, 255, 255, 0.08);
  --input: rgba(255, 255, 255, 0.10);
  --ring: var(--color-primary-400);

  --chart-1: var(--color-primary-400);
  --chart-2: var(--color-primary-300);
  --chart-3: var(--color-primary-600);
  --chart-4: var(--color-primary-200);
  --chart-5: var(--color-primary-500);

  --sidebar: var(--color-gray-900);
  --sidebar-foreground: var(--color-gray-50);
  --sidebar-primary: var(--color-primary-400);
  --sidebar-primary-foreground: var(--color-primary-950);
  --sidebar-accent: var(--color-gray-800);
  --sidebar-accent-foreground: var(--color-primary-100);
  --sidebar-border: rgba(255, 255, 255, 0.08);
  --sidebar-ring: var(--color-primary-400);
}

@layer components {
  /* Dual-thumb range slider — 트랙 클릭은 무시, 핸들만 드래그 가능 */
  .dual-range {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    pointer-events: none;
    outline: none;
    margin: 0;
    height: 100%;
  }
  .dual-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 9999px;
    background: var(--color-pullim-blue-600);
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
    cursor: grab;
    pointer-events: auto;
    margin-top: 0;
    transition: transform 120ms ease;
  }
  .dual-range::-webkit-slider-thumb:hover { transform: scale(1.1); }
  .dual-range::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.15); }
  .dual-range::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 9999px;
    background: var(--color-pullim-blue-600);
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
    cursor: grab;
    pointer-events: auto;
    transition: transform 120ms ease;
  }
  .dual-range::-moz-range-thumb:hover { transform: scale(1.1); }
  .dual-range::-moz-range-thumb:active { cursor: grabbing; transform: scale(1.15); }
  .dual-range::-webkit-slider-runnable-track { background: transparent; height: 100%; }
  .dual-range::-moz-range-track { background: transparent; height: 100%; }
  .dual-range:focus-visible::-webkit-slider-thumb { outline: 2px solid var(--color-pullim-blue-400); outline-offset: 2px; }
  .dual-range:focus-visible::-moz-range-thumb { outline: 2px solid var(--color-pullim-blue-400); outline-offset: 2px; }
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings: 'tnum' 1, 'cv11' 1;
    letter-spacing: -0.01em;
    min-width: 320px;
  }
  html {
    @apply font-sans;
  }
  h1, h2, h3 { letter-spacing: -0.02em; }
}
```

> **주의**: 위에는 기존 도메인 애니메이션(`score-bar`, `growBar`, `feedback-flash`, reduced-motion 가드)이 planner globals에는 없었고(그건 writing-coach globals) — planner globals 원본에는 `@layer components`(dual-range) + `@layer base`만 있었다. 원본 planner globals의 마지막 블록을 그대로 보존했다. 추가 커스텀 규칙이 원본에 더 있으면 삭제하지 말고 유지할 것.

- [ ] **Step 4: 커버리지 테스트 통과 확인**

Run: `bun --filter @pullim-planner/planner test globals-token-coverage`
Expected: PASS (모든 REQUIRED 토큰 정의 + tokens import + #3B6FF6 부재).

- [ ] **Step 5: typecheck · lint · 전체 테스트**

Run:
```bash
bun --filter @pullim-planner/planner typecheck
bun --filter @pullim-planner/planner lint
bun --filter @pullim-planner/planner test
```
Expected: 모두 그린(컴포넌트 편집 0이므로 기존 테스트 불변).

- [ ] **Step 6: Commit**

```bash
git add apps/planner/app/globals.css apps/planner/__tests__/globals-token-coverage.test.ts
git commit -m "feat(planner): re-point globals tokens onto PUDS pullim-os (name-preserving bridge)"
```

---

### Task 3: `layout.tsx` — pullim-os 테마 활성화

**Files:**
- Modify: `apps/planner/app/layout.tsx`

**Interfaces:**
- Consumes: Task 1/2의 `[data-theme="pullim-os"]` 토큰(활성화 필요).
- Produces: `<html>`에 `data-theme="pullim-os"` — primary 램프 등 pullim-os 토큰이 런타임 적용.

- [ ] **Step 1: `<html>`에 data-theme 부여**

`apps/planner/app/layout.tsx`의 `<html ...>` 엘리먼트에 `data-theme="pullim-os"`를 추가한다. 기존:
```tsx
    <html
      lang="ko"
      className={`${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
```
변경:
```tsx
    <html
      lang="ko"
      data-theme="pullim-os"
      className={`${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
```

- [ ] **Step 2: `themeColor`를 PUDS 블루로 갱신**

같은 파일 `viewport` 객체에서:
```tsx
  themeColor: '#3B6FF6',
```
→
```tsx
  themeColor: '#0362da',
```
(코치 pullim-os 블루 계열 — PWA/모바일 주소창 톤 정합.)

- [ ] **Step 3: typecheck + 테스트**

Run:
```bash
bun --filter @pullim-planner/planner typecheck
bun --filter @pullim-planner/planner test
```
Expected: PASS.

- [ ] **Step 4: dev 스모크 — pullim-os 적용 확인**

Run: `bun run dev:planner` (port 3030) 후 브라우저에서 `/planner` 로드. 확인:
- 헤더/버튼 primary가 **딥 블루(#0362da 계열)** 로 렌더(옛 브라이트 #3B6FF6 아님).
- 콘솔/터미널에 CSS `@import` 순서 에러 없음.

`Ctrl-C`로 종료.

- [ ] **Step 5: Commit**

```bash
git add apps/planner/app/layout.tsx
git commit -m "feat(planner): activate data-theme=pullim-os + PUDS themeColor"
```

---

### Task 4: 셸 리스킨 — 헤더 브랜드·메트릭 (코치 합성 미러)

**Files:**
- Modify: `apps/planner/components/shell/app-header.tsx`
- Modify: `apps/planner/components/shell/app-shell.tsx`

**Interfaces:**
- Consumes: `PullimLogo`, `useAuth`, `nav-config` (변경 없음). 토큰은 Task 2가 이미 재지정.
- Produces: 코치 `DashboardShell` 헤더 정합 — 60px 높이 + "풀림" 17px extrabold + "플래너" 중립 pill. 콘텐츠 max-w 1180.

- [ ] **Step 1: 헤더 높이·브랜드 정합**

`app-header.tsx`에서 헤더 바 높이를 코치 60px에 맞추고(현 `h-14`=56px), 브랜드를 코치 트리트먼트로 교체.

교체 ① — 바 높이:
```tsx
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
```
→
```tsx
      <div className="flex h-[60px] items-center gap-2 px-3 md:px-4">
```

교체 ② — 브랜드 블록(로고 옆 라벨). 기존:
```tsx
        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <PullimLogo size={22} />
          <span className="text-pullim-slate-500 hidden text-[10px] font-bold uppercase md:inline">
            플래너
          </span>
        </Link>
```
→ (코치 Brand: 풀림 17px extrabold + 서비스명 중립 pill)
```tsx
        <Link href="/" className="flex items-center gap-2 shrink-0 no-underline">
          <PullimLogo size={22} />
          <span className="text-foreground text-[17px] font-extrabold tracking-[-.02em]">풀림</span>
          <span className="bg-muted text-muted-foreground hidden whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-semibold min-[380px]:inline-block">
            플래너
          </span>
        </Link>
```

- [ ] **Step 2: 콘텐츠 max-width 1180 정합**

`app-shell.tsx`에서 콘텐츠 컨테이너 폭을 코치(1180)에 맞춤. 기존:
```tsx
const CONTENT_MAX = 'mx-auto w-full max-w-[1280px]';
```
→
```tsx
const CONTENT_MAX = 'mx-auto w-full max-w-[1180px]';
```

- [ ] **Step 3: 사이드바 폭 토큰 정합(선택적 미세 조정)**

`app-shell.tsx`의 데스크톱 aside 폭 `lg:w-60`(240px)은 코치 레일과 동일하므로 유지. 변경 없음(확인만).

- [ ] **Step 4: typecheck + lint + 테스트**

Run:
```bash
bun --filter @pullim-planner/planner typecheck
bun --filter @pullim-planner/planner lint
bun --filter @pullim-planner/planner test
```
Expected: PASS.

- [ ] **Step 5: dev 스모크 — 헤더 육안 확인**

Run: `bun run dev:planner` → `/planner`. 확인: 헤더 높이 60px, 좌측 "풀림"(볼드) + "플래너"(회색 pill), 우측 D-day/스트릭/검색/알림/프로필 정상. 모바일 폭(<380px)에서 pill 숨김 정상.

- [ ] **Step 6: Commit**

```bash
git add apps/planner/components/shell/app-header.tsx apps/planner/components/shell/app-shell.tsx
git commit -m "feat(planner): mirror PUDS coach shell — 60px header, 풀림+플래너 brand, 1180 content"
```

---

### Task 5: 셸 리스킨 — 모바일 탭바 OsTabbar 메트릭 미러

**Files:**
- Modify: `apps/planner/components/shell/bottom-nav.tsx`

**Interfaces:**
- Consumes: `studentBottomTabs` (변경 없음).
- Produces: 코치 `OsTabbar` 시각 정합(높이 64px 안전영역 + active primary 강조).

- [ ] **Step 1: 탭바 높이·안전영역·active 톤 정합**

`bottom-nav.tsx`의 `<nav>` 래퍼와 링크 클래스를 코치 OsTabbar 메트릭에 맞춤. 기존 `<nav>`:
```tsx
    <nav
      aria-label="학생 메인 네비게이션"
      className="bg-background/95 sticky bottom-0 z-30 border-t backdrop-blur-md md:hidden"
    >
```
→ (safe-area 하단 패딩 추가 — `_base.css`의 `.safe-bottom` 활용)
```tsx
    <nav
      aria-label="학생 메인 네비게이션"
      className="bg-background/95 safe-bottom sticky bottom-0 z-30 border-t backdrop-blur-md md:hidden"
    >
```

기존 링크 클래스(active 색):
```tsx
                  active
                    ? 'text-pullim-blue-600'
                    : 'text-pullim-slate-500 hover:text-pullim-slate-800',
```
→ (시맨틱 토큰으로 — primary 정합)
```tsx
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
```

- [ ] **Step 2: typecheck + lint + 테스트**

Run:
```bash
bun --filter @pullim-planner/planner typecheck
bun --filter @pullim-planner/planner lint
bun --filter @pullim-planner/planner test
```
Expected: PASS.

- [ ] **Step 3: dev 스모크 — 모바일 탭바 확인**

Run: `bun run dev:planner` → 브라우저 반응형(모바일 폭)으로 `/planner`. 확인: 하단 탭바 4개(홈/관리/리포트/소개), active 탭이 primary 블루, 홈 인디케이터/safe-area 겹침 없음.

- [ ] **Step 4: Commit**

```bash
git add apps/planner/components/shell/bottom-nav.tsx
git commit -m "feat(planner): mirror PUDS OsTabbar metrics on mobile bottom nav"
```

---

### Task 6: 컨벤션 문서 갱신 + 최종 검증

**Files:**
- Modify: `apps/planner/CLAUDE.md`

**Interfaces:**
- Consumes: 없음.
- Produces: 갱신된 컨벤션(vendored-토큰-yes / 레지스트리-no).

- [ ] **Step 1: `apps/planner/CLAUDE.md`의 DS 서술 갱신**

"## UI 컴포넌트 — shadcn/ui 사용" 섹션의 아래 라인:
```
이 앱은 **shadcn/ui + Base UI** 로컬 프리미티브 기반이다. (pullim 정본의 `@pullim/design-system` 미사용 — 별 트랙)
```
→
```
이 앱은 **shadcn/ui + Base UI** 로컬 프리미티브 기반이다. 디자인 **토큰**은 PUDS `pullim-os`를 vendored CSS(`app/tokens/{_base.css,pullim-os.css}` + `app/globals.css` 브릿지)로 소비해 코치(writing/admissions)와 정합한다. 단 `@pullim/design-system` npm 패키지·`@puds/*` 레지스트리 컴포넌트는 **여전히 미설치**(import 금지) — 토큰만 차용, 컴포넌트는 로컬 유지. 정합 근거: [proc/plan/2026-07-04_planner-puds-design-adoption.md](../../proc/plan/2026-07-04_planner-puds-design-adoption.md)
```

(같은 문서 하단 "### 금지" 코드블록의 `import { Button } from "@pullim/design-system"; // 미설치`는 그대로 유지 — 레지스트리 미채택이라 여전히 유효.)

- [ ] **Step 2: 전체 게이트 재확인**

Run:
```bash
bun --filter @pullim-planner/planner typecheck
bun --filter @pullim-planner/planner lint
bun --filter @pullim-planner/planner test
bun --filter @pullim-planner/planner build
```
Expected: 모두 그린(build standalone 포함).

- [ ] **Step 3: 코치 대비 시각 패리티 스모크**

두 dev 서버를 나란히 비교:
- `bun run dev:planner` (planner, 3030)
- 코치 1종 실행(예: `pullim-writing-coach`에서 `npm run dev`)

확인 항목:
1. **블루**: planner primary 버튼/링크가 코치와 동일 딥 블루 계열.
2. **중립**: 카드/보더/배경 그레이 톤이 코치와 이질감 없음.
3. **radius**: 버튼/카드 모서리 sharp(8px 계열) 정합.
4. **셸**: 헤더(풀림+서비스 pill) · 좌측 레일 · 모바일 탭바 합성이 코치와 동일 계열.
5. **다크 미발화**: 라이트로만 렌더(`.dark` 토글 없음).

- [ ] **Step 4: Commit**

```bash
git add apps/planner/CLAUDE.md
git commit -m "docs(planner): update DS convention — vendored PUDS tokens, registry still opt-out"
```

- [ ] **Step 5: PR 생성 (FE 단독)**

```bash
git push -u origin <feature-branch>
gh pr create --title "feat(planner): PUDS 디자인 시스템 정합 (토큰 + 셸)" \
  --body "코치(writing/admissions)와 동일 PUDS pullim-os 토큰으로 정합. 이름 보존 브릿지(컴포넌트 편집 0) + 셸 미러링. 설계: proc/plan/2026-07-04_planner-puds-design-adoption.md"
```
Codex Review 통과 후 머지(리포 §5 오케스트레이션 체크리스트).

---

## Self-Review (spec 대비)

- **토큰 정합(설계 §변경상세 1·2)** → Task 1(vendored) + Task 2(브릿지). ✅
- **코치 블루 채택(설계 결정 3)** → Task 2 blue 램프 재지정 + Task 3 themeColor. ✅
- **풀 셸 리스킨(설계 결정 5)** → Task 4(헤더/콘텐츠) + Task 5(탭바). ⚠️ 좌측 레일 collapse는 코치 `RailCollapseProvider`(레지스트리 산출물) 의존이라 미도입 — 스코프(레지스트리 미설치)에 따라 폭/스타일 정합만 유지, collapse 토글은 비범위(설계 위험 항목에 명시된 hand-mirror 한계).
- **data-theme 활성(설계 위험)** → Task 3. ✅
- **다크 휴면(설계 결정 6)** → Task 2 `.dark` 재테마, 토글 미배선. ✅
- **CLAUDE.md 갱신(설계 §4)** → Task 6. ✅
- **FE 단독 단일 PR(설계 결정 7)** → Task 6 Step 5. ✅
- **회귀 가드(설계 위험 100+파일)** → Task 2 커버리지 테스트 + 각 태스크 dev 스모크. ✅
- **placeholder 스캔**: 모든 스텝에 실제 코드/명령/기대출력 포함. TBD 없음. ✅
- **타입 정합**: 신규 함수/시그니처 없음(CSS + 마크업 편집). 커버리지 테스트만 신규 — 이름 일치 확인함. ✅
