# apps/planner

풀림 플래너 FE — Next.js 16 (App Router), port 3030. 학생용 학습 플래너 (시간표, 블록, 컨디션, 번아웃, 리포트).

전체 모노레포 가이드는 [루트 CLAUDE.md](../../CLAUDE.md), 도메인 권위는 [input/docs-archive/08_풀림_플래너_핸드오프.md](../../input/docs-archive/08_풀림_플래너_핸드오프.md), BE 차용 plan은 [proc/plan/2026-05-26_pullim-be-adoption.md](../../proc/plan/2026-05-26_pullim-be-adoption.md).

> ⚠️ **linked plan 경로 표기 주의** — `proc/plan/2026-05-26_pullim-be-adoption.md`, `proc/plan/2026-05-26_container-presenter-adoption.md` 두 문서 모두 D-Lite 이전 작성됐다. 본문이 `src/lib/mock/...`, `src/components/...` 기준으로 서술돼 있지만, 실제 코드는 이미 `src/` 제거 완료 — 현 경로는 `apps/planner/{lib,components,app}/...` 다. plan 의 의도·완료기준만 참고하고 경로는 현재 트리 기준으로 해석할 것.

## UI 컴포넌트 — shadcn/ui 사용

이 앱은 **shadcn/ui + Base UI** 로컬 프리미티브 기반이다. 디자인 **토큰**은 PUDS `pullim-os`를 vendored CSS(`app/tokens/{_base.css,pullim-os.css}` + `app/globals.css` 브릿지)로 소비해 코치(writing/admissions)와 정합한다. 단 `@pullim/design-system` npm 패키지·`@puds/*` 레지스트리 컴포넌트는 **여전히 미설치**(import 금지) — 토큰만 차용, 컴포넌트는 로컬 유지. 정합 근거: [proc/plan/2026-07-04_planner-puds-design-adoption.md](../../proc/plan/2026-07-04_planner-puds-design-adoption.md)

```
@/components/ui/*       ← shadcn/ui 프리미티브 (Button, Card, Dialog, Input, Tabs 등)
lucide-react            ← 아이콘 (DS 재export 없음 — 직접 import 허용)
sonner                  ← toast (DS 재export 없음 — 직접 import 허용)
@base-ui/react          ← 일부 복합 컴포넌트
```

- DS 패키지(`@pullim/design-system`) 미설치 — import 시도 금지
- 새 shadcn 컴포넌트는 `bunx shadcn@latest add <name>` 로 추가 (`components.json` 의 css 경로는 `app/globals.css`)
- `cn` → `@/lib/utils`

## i18n — 미도입

- 사용자 노출 텍스트 **한국어 하드코딩** 허용 (next-intl 미설치)
- 추후 i18n 도입은 별 트랙으로 진행 — 현 단계에서는 `useTranslations()` 패턴 도입 금지

## 관측 / 분석

- **Sentry 미설치** — `@sentry/*` import 금지, `logService` 패턴 미사용
- **`@pullim/analytics`, `@pullim/remote-config` 미설치** — import 금지
- **`@vercel/analytics` 는 도입 완료** — `app/layout.tsx` 의 `<Analytics />` 마운트, 그리고 `track()` 호출 (예: `components/features/planner-reports/containers/ReportsContainer.tsx`) 패턴 허용
- 에러는 `console.error` 또는 `toast.error` 로만 처리

## 데이터 레이어 — mock → NestJS+TypeORM (이식 중)

현재 FE 는 `apps/planner/lib/mock/*` 에 잔존하는 mock 위주로 동작한다. BE 차용 계획에 따라 `apps/backend` (NestJS 11 + TypeORM, port 4030) 로 점진 이식 중이다. FE / BE 어느 쪽에도 **Drizzle 의존성은 없다** (Phase α 에서 폐기 완료).

- 권위 plan: [proc/plan/2026-05-26_pullim-be-adoption.md](../../proc/plan/2026-05-26_pullim-be-adoption.md) — `Drizzle → NestJS+TypeORM 완전 대체` 방향
- 새 mock 추가 시에는 미래 BE entity 시그니처와의 정합을 고려

## Mock 잔존 — BE 이식 예정

```
apps/planner/lib/mock/
├── planner.ts                  ← 시간표·블록·컨디션·번아웃 (핵심 시그니처)
├── curriculum.ts · family.ts · features.ts
├── persona.ts · subscriptions.ts
└── index.ts (barrel export)
```

- **현재 상태**: 페이지/Container 뿐 아니라 Presenter / feature `components/*` / `shell/*` 에서도 `@/lib/mock/*` 을 직접 import (예: `planner-home/components/*`, `planner-onboarding/presenters/*`, `planner-reports/components/*`, `shell/app-header.tsx`). 기존 코드는 그대로 둔다
- **신규 코드 권장**: `Container → Presenter` 로 props 주입, mock selector 호출은 Container 에 모은다 (Container/Presenter plan 의 목표 상태)
- **타입 import** (`import type { Planner } from '@/lib/mock'`) 은 어디서나 허용
- Phase γ에서 `apps/backend` API 로 점진 교체 예정

## 디렉터리 구조 (src/ 없음 — `apps/planner/` 직속)

```
apps/planner/
├── app/                                # App Router (no src/)
│   ├── (student)/                      # 플래너 라우트 그룹
│   ├── layout.tsx · globals.css
│   └── opengraph-image.tsx · twitter-image.tsx
├── components/
│   ├── ui/                             # shadcn/ui 프리미티브
│   ├── shell/                          # AppHeader, AppSidebar, BottomNav, nav-config.ts
│   ├── brand/                          # 로고
│   ├── features/<도메인>/              # Container/Presenter (planner-home, planner-manage, planner-onboarding, planner-reports)
│   ├── shared/                         # 진짜 순수 뷰 (d-day-chip 등)
│   ├── planner-builder/ · builder/     # 미이동 (Phase 4에서 features/로 이식 예정)
├── lib/
│   ├── mock/                           # mock 데이터
│   ├── planner/                        # 도메인 helper (d-day-tier 등)
│   ├── hooks/ · tokens/
│   └── utils.ts                        # cn 등
├── public/
├── __tests__/                          # Jest 단위 테스트
├── test/setup.ts                       # 앱 전용 Jest setup
├── jest.config.ts
├── package.json · tsconfig.json
├── next.config.ts · postcss.config.mjs · eslint.config.mjs
├── components.json                     # shadcn 설정 (css: app/globals.css)
└── Dockerfile
```

## 수정 금지 영역

| 경로                    | 이유              |
| ----------------------- | ----------------- |
| `lib/hooks/`            | 개발자 전용       |
| `package.json`          | 의존성 변경 금지  |
| `next.config.ts`        | 설정 변경 금지    |
| `tsconfig.json`         | 설정 변경 금지    |

## Container/Presenter 패턴

```
components/features/<도메인>/
├── containers/     ← 상태, 핸들러, mock 호출. "use client"
├── presenters/     ← 순수 렌더링. props만 받음
├── components/     ← 도메인 내부 재사용 UI
├── hooks/          ← 도메인 hook (선택)
└── types.ts        ← 공유 타입 (선택)
```

- `app/(student)/.../page.tsx` 는 Container만 import + Suspense 래핑
  - **예외 — thin redirect/래퍼 페이지** (`~20줄 이하`): `/planner/calendar`, `/planner/day`, `/planner/week`, `/planner/month`, `/planner/builder` 같은 redirect-only 페이지는 Container/Presenter 분리에서 제외 (루트 [AGENTS.md](../../AGENTS.md) 와 동일 기준)
- Container에서 `useState`/`useCallback`/`useRouter` 사용
- Presenter / 하위 컴포넌트에서 API 호출 / 라우팅 hook 사용 금지 (간단한 UI 상태 useState 는 허용)
- 진행 중인 재편 plan: [proc/plan/2026-05-26_container-presenter-adoption.md](../../proc/plan/2026-05-26_container-presenter-adoption.md)

### cross-feature import 정책
- feature A의 widget을 feature B에서 import 허용 (예: `planner-onboarding` 이 `planner-home` widget 빌려옴)
- 단 widget 소유권이 한쪽 feature에 명확해야 함
- 양방향 의존 금지 (feature 그래프가 사이클 없도록)
- 빌려오는 쪽은 widget을 **있는 그대로** 사용 (감싸서 동작 변경 금지)

## 코드 패턴

### 허용

```tsx
const [isOpen, setIsOpen] = useState(false);
import { getMockPlanner } from "@/lib/mock/planner";
import { Button } from "@/components/ui/button";    // shadcn (DS 아님)
import { Search } from "lucide-react";              // 직접 import OK
import { toast } from "sonner";                     // 직접 import OK
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
```

### 금지

```tsx
import { Button } from "@pullim/design-system";       // 미설치
import { useTranslations } from "next-intl";         // 미도입
import * as Sentry from "@sentry/nextjs";            // 미도입
fetch("/api/...");                                   // BE 연동 후 @pullim-planner/api-client 사용
```

## 스타일링

- Tailwind CSS v4 만 사용 (인라인 style 금지)
- 모바일 우선 반응형: 기본 → `md:` → `lg:`
- shadcn semantic 토큰: `text-foreground`, `bg-background`, `border-border`
- primitive 토큰(`text-gray-500` 등)보다 semantic 토큰 우선
- 교육 서비스 특성상 **촘촘한 UI 권장**, 과도한 여백 지양

## 테스트

- **Jest + RTL** (단위 테스트): `bun --filter @pullim-planner/planner test`
  - 설정: `apps/planner/jest.config.ts`, `apps/planner/test/setup.ts`
  - 공통 mock: `<repo-root>/config/jest.setup.ts` (next/navigation 등)

## 커밋 전 확인

- `bun --filter @pullim-planner/planner typecheck` 통과
- `bun --filter @pullim-planner/planner lint` 통과
- `bun --filter @pullim-planner/planner test` 통과
- shadcn 외 컴포넌트 소스 import 없는지 확인 (DS 패키지 import 금지)

## 명령어

| 작업                    | 명령                                              |
| ----------------------- | ------------------------------------------------- |
| dev (port 3030)         | `bun --filter @pullim-planner/planner dev`        |
| build (standalone)      | `bun --filter @pullim-planner/planner build`      |
| typecheck               | `bun --filter @pullim-planner/planner typecheck`  |
| lint                    | `bun --filter @pullim-planner/planner lint`       |
| test (Jest)             | `bun --filter @pullim-planner/planner test`       |
