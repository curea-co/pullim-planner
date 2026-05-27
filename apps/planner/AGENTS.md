# apps/planner AGENTS.md

> AI 코드 리뷰 에이전트(Codex 등)가 PR을 리뷰할 때 참고하는 가이드라인.

## 앱 개요
- 학생 앱 (Next.js 16 App Router, port 3030) — 학습 플래너
- API: 현 단계 mock 위주, BE 차용 plan에 따라 `apps/backend` (NestJS 11, port 4030) 로 점진 이식 (`proc/plan/2026-05-26_pullim-be-adoption.md`)
- 인증: 미도입 (Phase γ에서 `@pullim-planner/auth` 추상화 위에 구현 예정)
- i18n: 미도입 (한국어 하드코딩 허용)
- UI: `@/components/ui/*` (shadcn/ui + Base UI). DS 패키지 미사용
- 관측: Sentry / `@pullim/analytics` / `@pullim/remote-config` 미도입 (`@vercel/analytics` 는 이미 도입 — `app/layout.tsx`, `components/features/planner-reports/containers/ReportsContainer.tsx` 에서 사용 중)
- 상태: useState (UI), Container 내부에서 상태/핸들러 직접 관리
- 도메인 권위: `input/docs-archive/08_풀림_플래너_핸드오프.md`

## 디렉터리 구조 (src/ 없음 — `apps/planner/` 직속)

```
apps/planner/
├── app/                                # App Router (Container import + Suspense)
│   └── (student)/                      # 플래너 라우트 그룹
├── components/
│   ├── ui/                             # shadcn/ui 프리미티브
│   ├── shell/                          # AppHeader, AppSidebar, BottomNav, nav-config.ts
│   ├── brand/
│   ├── features/<도메인>/              # planner-home, planner-manage, planner-onboarding, planner-reports
│   ├── shared/                         # 순수 뷰 위젯
│   └── planner-builder/ · builder/     # Phase 4에서 features/ 이식 예정
├── lib/
│   ├── mock/                           # mock 데이터
│   ├── planner/                        # 도메인 helper
│   ├── hooks/ · tokens/
│   └── utils.ts
├── __tests__/                          # Jest 단위 테스트
├── e2e/                                # (선택) Playwright
└── package.json · jest.config.ts · tsconfig.json
```

---

## Must Fix (병합 차단)

### 1. UI 컴포넌트 소스
- `@/components/ui/*` (shadcn/ui) 사용 — 이 앱은 DS 패키지 미설치
- `lucide-react`, `sonner` 직접 import **허용** (DS 재export 없음)
- ❌ 금지 import:
  - `@pullim/design-system/*` (미설치)
  - `@pullim/ui` (미설치)
  - MUI / FontAwesome 등 미설치 패키지

### 2. i18n
- **i18n 미도입 — 한국어 하드코딩 허용**
- `useTranslations()` / `getTranslations()` / `next-intl` 도입 금지 (별 트랙)
- 메시지 파일 (`messages/*.json`) 없음

### 3. 관측 / 분석
- ❌ `@sentry/*` import 금지 (Sentry 미도입)
- ❌ `@pullim/analytics`, `@pullim/remote-config` import 금지 (미설치)
- ✅ `@vercel/analytics` 는 이미 도입 — `app/layout.tsx` 의 `<Analytics />`, 그리고 `track()` 호출 (예: `ReportsContainer.tsx`) 패턴 허용
- 에러 처리: `console.error` / `toast.error` 만 사용

### 4. 수정 금지 영역
| 경로 | 이유 |
|---|---|
| `lib/hooks/` | 개발자 전용 |
| `package.json` | 의존성 변경 |
| `next.config.ts` | 설정 변경 |
| `tsconfig.json` | 설정 변경 |

→ 배포 파이프라인 도입·긴급 이슈 대응 등 예외는 **PR 본문 근거 명시 필수**.

### 5. Container / Presenter 패턴
- `components/features/<도메인>/`:
  - `containers/` — `"use client"`, 상태·핸들러·mock 호출만. `useState`, `useCallback`, `useRouter`, `useSearchParams`
  - `presenters/` — 순수 렌더링, props 만 받음. `"use client"` 없음 권장
  - `components/` — 도메인 내부 재사용 UI
  - `hooks/` — 도메인 hook (선택)
- `app/(student)/.../page.tsx` 는 **Container import + `<Suspense>` 래핑** 만. 로직 금지
  - **예외 — 분리 안 해도 되는 페이지**: thin page (~20줄 이하, redirect/래퍼만). 현 `app/(student)/planner/{calendar,day,week,month,builder}/page.tsx` 같은 redirect 전용 페이지는 Container/Presenter 분리에서 제외 (루트 [AGENTS.md](../../AGENTS.md) 와 동일 기준)
- Presenter / components 에서 라우팅 hook 사용 **금지** (간단한 UI 상태 useState 는 허용)
- **cross-feature import 허용** — widget 소유권이 명확하고 사이클 없는 경우. 빌려오는 쪽은 widget 동작 변경 금지

### 6. 데이터 레이어
- ❌ `fetch("/api/...")` 직접 호출 금지 — BE 연동 후에는 `@pullim-planner/api-client` 사용
- 현 단계 mock 데이터: `lib/mock/*` 에서 import
  - **현재 상태**: Presenter / feature `components/*` / `shell/*` 에서도 `@/lib/mock` 을 직접 import 하는 코드가 다수 존재 (예: `planner-home/components/*`, `planner-onboarding/presenters/*`, `planner-reports/components/*`, `shell/app-header.tsx`) — 기존 코드 그대로 허용
  - **신규 코드 권장**: `Container → Presenter` 로 props 주입. mock selector 호출은 Container 에 모으는 방향으로 점진 이행
  - **타입 import (`import type { Planner } from '@/lib/mock'`)** 는 Presenter / 하위 컴포넌트 어디서나 허용
- mock 메타 구조 변경은 미래 BE entity 정합 영향 — 신중하게

### 7. shared/ 승격 조건
- `components/shared/` 에는 **진짜 순수 뷰**만:
  - state·router·side effect·mock selector 일체 없음
  - **도메인 계산도 없음** (tier 분류, 시험/블록 분기 등). 모든 표시값은 props로 주입
  - 도메인 계산이 필요하면 `lib/planner/*` helper(예: `composeDDayChipProps`)를 두고 호출자가 compose
- **widget 추가는 신중** (`shared/` 가 잡동사니 저장소가 되는 것 방지)

### 8. 보안
- Secret 하드코딩 금지
- `process.env.*` 직접 참조는 **`NEXT_PUBLIC_*`** 만 허용
- 서버 전용 env 는 server-only 모듈에서만

---

## Should Fix (권장 수정)

### 9. 스타일링
- **Tailwind CSS v4 만** (인라인 `style={{...}}` 금지)
- shadcn semantic 토큰 우선: `text-foreground`, `bg-background`, `border-border`
- primitive 토큰 (`text-gray-500`, `bg-white`) 보다 semantic 우선
- `cn` 유틸: `@/lib/utils`
- 모바일 우선 반응형: 기본 → `md:` → `lg:`
- 교육 서비스 — **촘촘한 UI 권장**, 과도한 여백 지양

### 10. 모바일 대응
- shadcn `Dialog` 가 `mobileFullscreen` 미지원 시: `useSyncExternalStore` 로 isMobile 분기 (JS 레벨)
- ❌ CSS `hidden` 으로 모바일/데스크탑 분기 불가 (모달 portal 과 충돌)
- 모바일 = 풀스크린 `<div>`, 데스크탑 = `<Dialog>`

### 11. 파일 네이밍
- 컴포넌트 파일: 현 코드베이스 컨벤션 — kebab-case.tsx (`d-day-chip.tsx`) 또는 PascalCase.tsx (`HomeContainer.tsx`). feature 내부에선 일관성 유지
- 훅 파일: **use-X.ts** (kebab-case)
- 유틸 / 스키마: kebab-case 또는 `schema.ts` 고정
- types 는 **types.ts** 고정

### 12. import 경로
- `@/*` = `apps/planner/` 루트 alias (src/ 없음)
- `@pullim-planner/*` = workspace 패키지 (현재 packages/* 는 빈 placeholder)
- 같은 feature 내부는 상대 경로 허용
- `import type` 사용 (TS 컴파일 최적화)

### 13. 테스트
- **Jest + RTL** (단위 테스트, `bun --filter @pullim-planner/planner test`)
  - 설정: `apps/planner/jest.config.ts` + `apps/planner/test/setup.ts`
  - 공통 setup: `<repo-root>/config/jest.setup.ts` (next/navigation mock)
  - `next/navigation` mock 은 전역 자동
  - 컴포넌트 테스트는 RTL `render` + user-event 패턴

---

## Nit
- 변수명 개선 제안
- 접근성 (aria-*, semantic HTML)
- import 순서 정렬 (외부 → workspace → 내부)
- 중복 로직 추출 제안

---

## 자동 검증 명령

```bash
bun --filter @pullim-planner/planner typecheck
bun --filter @pullim-planner/planner lint
bun --filter @pullim-planner/planner test
bun --filter @pullim-planner/planner build
```
