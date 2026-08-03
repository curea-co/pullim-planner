# This is NOT the Next.js you know

This version (Next.js 16) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# AGENTS.md

> AI 코드 리뷰 에이전트(Codex 등)가 PR을 리뷰할 때 참고하는 가이드라인.

## 앱 개요
- 학생용 학습 플래너 — Next.js 16 App Router, 단일 앱 리포 (모노레포 아님). dev port 3006
- BE: **pullim-api** (별도 리포) — 세션(쿠키 SSO + CSRF)·planner 데이터 모두 pullim-api. 이 리포에 BE 코드 없음 (구 apps/backend 는 2026-07-31 폐기)
- 인증: `lib/auth/auth-context.tsx` + `lib/api-client/` (쿠키 세션). dev 화면 확인은 `NEXT_PUBLIC_DEV_AUTH_BYPASS=1` + localhost
- i18n: 미도입 (한국어 하드코딩 허용)
- UI: `@/components/ui/*` (shadcn/ui + Base UI). DS 패키지 미사용
- 관측: Sentry / `@pullim/analytics` / `@pullim/remote-config` 미도입. `@vercel/analytics` 도입 완료 (`app/layout.tsx` `<Analytics />`, `track()` 허용)
- 상태: useState (UI), Container 내부에서 상태/핸들러 직접 관리
- 도메인 권위: `input/docs-archive/08_풀림_플래너_핸드오프.md`

## 디렉터리 구조 (src/ 없음 — 리포 루트 직속)

```
pullim-planner/
├── app/                                # App Router (Container import + Suspense)
│   └── (student)/                      # 플래너 라우트 그룹
├── components/
│   ├── ui/                             # shadcn/ui 프리미티브
│   ├── shell/                          # AppHeader, AppSidebar, BottomNav, nav-config.ts
│   ├── brand/
│   ├── features/<도메인>/              # planner-home, planner-manage, planner-onboarding, planner-reports, planner-routine, auth
│   ├── shared/                         # 순수 뷰 위젯
│   └── planner-builder/ · builder/     # Phase 4에서 features/ 이식 예정
├── lib/
│   ├── api-client/                     # pullim-api fetch 래퍼 (쿠키 SSO + CSRF)
│   ├── auth/                           # auth-context, pullim-session-client
│   ├── mock/                           # mock 데이터
│   ├── planner/                        # 도메인 helper + pullim-client
│   ├── hooks/ · tokens/
│   └── utils.ts
├── __tests__/                          # Jest 단위 테스트
└── package.json · jest.config.ts · tsconfig.json
```

---

## Must Fix (병합 차단)

### 1. UI 컴포넌트 소스
- `@/components/ui/*` (shadcn/ui) 사용 — 이 앱은 DS 패키지 미설치
- `lucide-react`, `sonner` 직접 import **허용**
- ❌ 금지 import: `@pullim/design-system/*`, `@pullim/ui`, MUI / FontAwesome 등 미설치 패키지

### 2. i18n
- **i18n 미도입 — 한국어 하드코딩 허용**
- `useTranslations()` / `getTranslations()` / `next-intl` 도입 금지 (별 트랙)

### 3. 관측 / 분석
- ❌ `@sentry/*`, `@pullim/analytics`, `@pullim/remote-config` import 금지
- ✅ `@vercel/analytics` 허용
- 에러 처리: `console.error` / `toast.error` 만 사용

### 4. 수정 금지 영역
| 경로 | 이유 |
|---|---|
| `lib/hooks/` | 개발자 전용 |
| `package.json` | 의존성 변경 |
| `next.config.ts` · `tsconfig.json` | 설정 변경 |

→ 배포 파이프라인 도입·긴급 이슈 대응 등 예외는 **PR 본문 근거 명시 필수**.

### 5. Container / Presenter 패턴
- `components/features/<도메인>/`:
  - `containers/` — `"use client"`, 상태·핸들러·fetch/mock 호출만
  - `presenters/` — 순수 렌더링, props 만 받음
  - `components/` — 도메인 내부 재사용 UI
  - `hooks/` — 도메인 hook (선택)
- `app/(student)/.../page.tsx` 는 **Container import + `<Suspense>` 래핑** 만. 로직 금지
  - **예외**: thin page (~20줄 이하, redirect/래퍼만) — `app/(student)/planner/{calendar,day,week,month,builder}/page.tsx` 등
- Presenter / components 에서 라우팅 hook 사용 **금지** (간단한 UI 상태 useState 는 허용)
- **cross-feature import 허용** — widget 소유권이 명확하고 사이클 없는 경우. 빌려오는 쪽은 widget 동작 변경 금지

### 6. 데이터 레이어
- ❌ `fetch("/api/...")` 직접 호출 금지 — pullim-api 호출은 `lib/api-client/` + `lib/planner/pullim-client.ts` 경유
- mock 데이터: `lib/mock/*` — Presenter / `components/*` / `shell/*` 의 기존 직접 import 는 허용, **신규 코드는 Container → Presenter props 주입 권장**
- 타입 import (`import type { Planner } from '@/lib/mock'`) 는 어디서나 허용
- mock 메타 구조 변경은 pullim-api 계약 정합 영향 — 신중하게

### 7. shared/ 승격 조건
- `components/shared/` 에는 **진짜 순수 뷰**만: state·router·side effect·mock selector·도메인 계산 일체 없음. 모든 표시값은 props 주입
- 도메인 계산이 필요하면 `lib/planner/*` helper(예: `composeDDayChipProps`)를 두고 호출자가 compose

### 8. 보안
- Secret 하드코딩 금지
- `process.env.*` 직접 참조는 **`NEXT_PUBLIC_*`** 만 허용
- 서버 전용 env 는 server-only 모듈에서만

---

## Should Fix (권장 수정)

### 9. 스타일링
- **Tailwind CSS v4 만** (인라인 `style={{...}}` 금지)
- shadcn semantic 토큰 우선: `text-foreground`, `bg-background`, `border-border`
- `cn` 유틸: `@/lib/utils`
- 모바일 우선 반응형: 기본 → `md:` → `lg:`
- 교육 서비스 — **촘촘한 UI 권장**, 과도한 여백 지양

### 10. 모바일 대응
- shadcn `Dialog` 가 `mobileFullscreen` 미지원 시: `useSyncExternalStore` 로 isMobile 분기 (JS 레벨)
- ❌ CSS `hidden` 으로 모바일/데스크탑 분기 불가 (모달 portal 과 충돌)

### 11. 파일 네이밍
- 컴포넌트 파일: kebab-case.tsx (`d-day-chip.tsx`) 또는 PascalCase.tsx (`HomeContainer.tsx`). feature 내부에선 일관성 유지
- 훅 파일: **use-X.ts** (kebab-case)
- types 는 **types.ts** 고정

### 12. import 경로
- `@/*` = 리포 루트 alias (src/ 없음)
- 같은 feature 내부는 상대 경로 허용
- `import type` 사용 (TS 컴파일 최적화)

### 13. 테스트
- **Jest + RTL** (단위 테스트, `bun run test`)
  - 설정: `jest.config.ts` + `test/setup.ts` + 공통 `config/jest.setup.ts` (next/navigation mock 전역 자동)
  - 컴포넌트 테스트는 RTL `render` + user-event 패턴

---

## Nit
- 변수명 개선 제안
- 접근성 (aria-*, semantic HTML)
- import 순서 정렬 (외부 → 내부)
- 중복 로직 추출 제안

---

## 자동 검증 명령

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```
