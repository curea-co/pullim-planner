@AGENTS.md

# 풀림 플래너 작업 가이드

풀림 플래너 FE — Next.js 16 (App Router), 단일 앱 리포 (모노레포 아님). 학생용 학습 플래너 (시간표, 블록, 컨디션, 번아웃, 리포트).

- 도메인 권위: [input/docs-archive/08_풀림_플래너_핸드오프.md](input/docs-archive/08_풀림_플래너_핸드오프.md)
- BE: **pullim-api** (별도 리포 `/Users/sungho/pullim-api`, `src/planner/`) — 로그인/세션(쿠키 SSO)·planner 데이터 모두 pullim-api 가 담당 (흡수 전환 §10 cutover 완료). 이 리포에 BE 코드 없음
- 로컬 SSO 런북: [proc/2026-06-29_planner-local-sso-setup.md](proc/2026-06-29_planner-local-sso-setup.md) — `planner.pullim.local:3006` + `api.pullim.local:3000`(pullim-api) + `pullim.local:3001`(pullim-web 중앙 로그인)

> ⚠️ **plan 문서 경로 표기 주의** — `proc/plan/*.md` 문서들은 모노레포 시절(`apps/planner/...`) 또는 그 이전(`src/...`) 기준으로 서술돼 있다. 실제 코드는 2026-07-31 평탄화로 리포 루트 직속(`app/`, `components/`, `lib/`)이다. plan 의 의도·완료기준만 참고하고 경로는 현재 트리 기준으로 해석할 것.

## ⛔ 최상위 규칙 — PR은 작은 단위로 쪼개 올린다 (MUST)

- PR diff가 **Codex Review가 한 번에 탐지·수렴할 수 있는 depth를 초과**하면 리뷰가 무한 반복(COMMENTED 누적)되어 머지가 끝나지 않는다. 한 PR = 한 관심사.
- **Codex Review 통과** — PR 머지 전 필수.

## 디렉터리 구조 (src/ 없음 — 리포 루트 직속)

```
pullim-planner/
├── app/                                # App Router
│   ├── (student)/                      # 플래너 라우트 그룹
│   ├── login/ · signup/                # 인증 (signup → login redirect)
│   ├── layout.tsx · globals.css
│   └── opengraph-image.tsx · twitter-image.tsx
├── components/
│   ├── ui/                             # shadcn/ui 프리미티브
│   ├── shell/                          # AppHeader, AppSidebar, BottomNav, nav-config.ts
│   ├── brand/                          # 로고
│   ├── features/<도메인>/              # Container/Presenter (planner-home, planner-manage, planner-onboarding, planner-reports, planner-routine, studygram, auth)
│   ├── shared/                         # 진짜 순수 뷰 (d-day-chip 등)
│   └── planner-builder/ · builder/     # 미이동 (Phase 4에서 features/로 이식 예정)
├── lib/
│   ├── api-client/                     # pullim-api fetch 래퍼 (쿠키 SSO + CSRF) — 구 packages/api-client
│   ├── auth/                           # auth-context, pullim-session-client
│   ├── mock/                           # mock 데이터 (pullim-api 로 점진 교체 중)
│   ├── planner/                        # 도메인 helper (d-day-tier, day-nav, pullim-client 등)
│   ├── hooks/ · tokens/
│   └── utils.ts                        # cn 등
├── public/
├── __tests__/                          # Jest 단위 테스트
├── config/jest.setup.ts                # 공통 Jest mock (next/navigation 등)
├── test/setup.ts                       # 앱 Jest setup
├── proc/                               # plan / spec / knowhow / archive / research
├── input/                              # 기획 문서 (docs-archive 권위)
├── jest.config.ts · tsconfig.json · next.config.ts
├── package.json · bun.lock             # bun (워크스페이스 아님)
└── Dockerfile
```

## UI 컴포넌트 — shadcn/ui 사용

**shadcn/ui + Base UI** 로컬 프리미티브 기반. (pullim 정본의 `@pullim/design-system` 미사용 — 별 트랙)

```
@/components/ui/*       ← shadcn/ui 프리미티브 (Button, Card, Dialog, Input, Tabs 등)
lucide-react            ← 아이콘 (직접 import 허용)
sonner                  ← toast (직접 import 허용)
@base-ui/react          ← 일부 복합 컴포넌트
```

- DS 패키지(`@pullim/design-system`) 미설치 — import 시도 금지
- 새 shadcn 컴포넌트는 `bunx shadcn@latest add <name>` 로 추가 (`components.json` 의 css 경로는 `app/globals.css`)
- `cn` → `@/lib/utils`

## i18n — 미도입

- 사용자 노출 텍스트 **한국어 하드코딩** 허용 (next-intl 미설치)
- `useTranslations()` 패턴 도입 금지 (별 트랙)

## 관측 / 분석

- **Sentry 미설치** — `@sentry/*` import 금지
- **`@pullim/analytics`, `@pullim/remote-config` 미설치** — import 금지
- **`@vercel/analytics` 도입 완료** — `app/layout.tsx` 의 `<Analytics />`, `track()` 호출 패턴 허용
- 에러는 `console.error` 또는 `toast.error` 로만 처리

## 데이터 레이어 — pullim-api (쿠키 SSO) + mock 잔존

- 세션/로그인: `lib/auth/auth-context.tsx` → `pullimSession`(`lib/auth/pullim-session-client.ts`) → pullim-api `/auth/*`, `/planner/me`
- planner 데이터: `lib/planner/client.ts`(re-export) → `lib/planner/pullim-client.ts` → pullim-api `/planner/*`
- fetch 래퍼: `lib/api-client/` (cookie-http + CSRF, 401 시 세션 만료 전파)
- 화면 상당수는 아직 `lib/mock/*` 폴백 — dev bypass(`NEXT_PUBLIC_DEV_AUTH_BYPASS=1` + localhost)에서는 mock 으로 렌더
- 자체 NestJS BE(구 apps/backend)와 Bearer 클라이언트는 **2026-07-31 폐기 완료** — `fetch("/api/...")` 직접 호출 금지, 새 엔드포인트는 pullim-api 에 추가

## Container/Presenter 패턴

```
components/features/<도메인>/
├── containers/     ← 상태, 핸들러, fetch/mock 호출. "use client"
├── presenters/     ← 순수 렌더링. props만 받음
├── components/     ← 도메인 내부 재사용 UI
├── hooks/          ← 도메인 hook (선택)
└── types.ts        ← 공유 타입 (선택)
```

- `app/(student)/.../page.tsx` 는 Container만 import + Suspense 래핑
  - **예외 — thin redirect/래퍼 페이지** (~20줄 이하): `/planner/calendar`, `/planner/day`, `/planner/week`, `/planner/month`, `/planner/builder` 등
- Container에서 `useState`/`useCallback`/`useRouter` 사용
- Presenter / 하위 컴포넌트에서 API 호출 / 라우팅 hook 사용 금지 (간단한 UI 상태 useState 는 허용)

### cross-feature import 정책
- feature A의 widget을 feature B에서 import 허용 (widget 소유권이 한쪽에 명확할 때)
- 양방향 의존 금지 (feature 그래프가 사이클 없도록)
- 빌려오는 쪽은 widget을 **있는 그대로** 사용 (감싸서 동작 변경 금지)
- 진짜 순수 프리젠테이션(state·router·side effect·도메인 계산 없음)만 `components/shared/` 승격 — 표시값은 전부 props 주입, 도메인 계산은 `lib/planner/*` helper 로

## 스타일링

- Tailwind CSS v4 만 사용 (인라인 style 금지)
- 모바일 우선 반응형: 기본 → `md:` → `lg:`
- shadcn semantic 토큰 우선: `text-foreground`, `bg-background`, `border-border`
- 교육 서비스 특성상 **촘촘한 UI 권장**, 과도한 여백 지양

## 수정 금지 영역 (사용자 명시 확인 필요)

| 경로 | 이유 |
|---|---|
| `lib/hooks/` | 개발자 전용 |
| `package.json` | 의존성 변경 |
| `next.config.ts` · `tsconfig.json` | 설정 변경 |
| `.github/workflows/**` | CI/Codex Review 자동화 |
| 이 가이드 / AGENTS.md / README.md | 컨벤션 변경은 별도 작업으로 |

## 명령어

| 작업 | 명령 |
|---|---|
| 의존성 설치 | `bun install` |
| dev (port 3006) | `bun run dev` |
| build (standalone) | `bun run build` |
| typecheck | `bun run typecheck` |
| lint | `bun run lint` |
| test (Jest) | `bun run test` |

환경변수는 리포 루트 `.env.local` (템플릿: `.env.example`). 로컬 SSO 값은 런북 참조.

## Orchestration 체크리스트 (작업 마치기 전)

1. **`components/shell/nav-config.ts`** — `plannerSection` 안 href가 실제 라우트와 일치하는지
2. **`input/docs-archive/08_풀림_플래너_핸드오프.md`** — 권위 문서의 IA·용어와 코드가 어긋나지 않는지
3. **`lib/mock/planner.ts`** — 시간표·블록·컨디션·번아웃 등 시그니처 데이터 구조 일관성 (pullim-api 계약과 정합)
4. **커밋 전**: `bun run typecheck` · `bun run lint` · `bun run test` 통과
5. **Codex Review 통과** — PR 머지 전 필수
