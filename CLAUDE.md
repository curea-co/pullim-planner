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
│   ├── tokens/                         # PUDS 토큰 벤더링 (@puds/theme-puds) — 로컬 수정 금지
│   ├── (student)/                      # 플래너 라우트 그룹
│   ├── login/ · signup/                # 인증 (signup → login redirect)
│   ├── layout.tsx · globals.css
│   └── opengraph-image.tsx · twitter-image.tsx
├── components/
│   ├── ui/                             # 프리미티브 — 3레인 혼재 (§ UI 컴포넌트 판별표)
│   ├── charts/                         # PUDS 차트 벤더링 (donut) — README 에 재싱크 ADR
│   ├── shell/                          # AppHeader, AppSidebar, BottomNav, nav-config.ts
│   ├── brand/                          # 로고
│   ├── features/<도메인>/              # Container/Presenter (planner-home, planner-manage, planner-onboarding, planner-reports, planner-routine, auth)
│   ├── shared/                         # 진짜 순수 뷰 (d-day-chip 등)
│   └── planner-builder/ · builder/     # 미이동 (Phase 4에서 features/로 이식 예정)
├── lib/
│   ├── api-client/                     # pullim-api fetch 래퍼 (쿠키 SSO + CSRF) — 구 packages/api-client
│   ├── auth/                           # auth-context, pullim-session-client
│   ├── mock/                           # mock 데이터 (pullim-api 로 점진 교체 중)
│   ├── planner/                        # 도메인 helper (d-day-tier, day-nav, pullim-client 등)
│   ├── hooks/ · tokens/
│   ├── cn.ts                           # PUDS 벤더링 (@puds/cn) — 로컬 수정 금지
│   └── utils.ts                        # cn 재export (레거시 호출부용)
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

## UI 컴포넌트 — 3레인 (PUDS 원격 · 로컬 base-ui · 서비스 고유)

**토큰은 PUDS, 엔진은 로컬.** `proc/plan/2026-07-01_planner-puds-full-reskin.md` 의 결정
("엔진·API·호출부·의존성 불변 … Base UI→Radix 엔진 교체는 안 함")을 **뒤집는 게 아니라 잇는 규칙**이다.
색·라운드·간격·명암은 PUDS 레지스트리에서 받고, 프리미티브 엔진은 `@base-ui/react` 로 유지한다.

DS npm 패키지(`@pullim/design-system`·`@pullim/ui`)는 **미설치 — import 금지.** PUDS 는 npm 의존성이 아니라
`components.json` 의 `@puds` 레지스트리에서 **소스를 복사(벤더링)** 해 온다.

### 판별표

| 레인 | 무엇 | 파일 | 규칙 |
|---|---|---|---|
| **① PUDS 원격** | 토큰·유틸·무의존 프리미티브·차트 | `app/tokens/*.css` · `lib/cn.ts` · `components/ui/{card,badge,input,skeleton}.tsx` · `components/charts/donut.tsx` | **로컬 수정 금지.** 고쳐야 하면 PUDS 저장소에 고치고 재설치 |
| **② 로컬 base-ui 프리미티브** | 상류 base-nova + PUDS 레시피 이식 하이브리드 | `components/ui/{button,dialog,sheet,tabs,avatar,label,separator,scroll-area,dropdown-menu,tooltip,progress}.tsx` | **PUDS 프리미티브로 교체 금지** (아래 이유) |
| **③ 서비스 고유** | PUDS 에 없거나 API 가 다른 것 | `components/ui/{meta-row,sonner}.tsx` · `app/os-topbar.css` · `components/{shell,features,shared,brand}/*` | 자유롭게 수정 |

### ① PUDS 원격 — 설치·재설치

레지스트리 URL 은 **경로로 버전이 고정**돼 있다 (`components.json` → `registries["@puds"]`):

```
https://pullim-design-system.vercel.app/v/0.3.0/{name}.json
                                        ^^^^^^^ 여기가 고정 지점
```

`/v/<버전>/` 의 내용은 PUDS 저장소의 `registry-releases/<버전>/` 에 **커밋돼 있어서** main 에 무엇이 푸시돼도
변하지 않는다. 호스트는 프로덕션 최신을 추종하지만 경로가 고정이라 상관없다.

> **v0.2.0 → v0.3.0 은 이 저장소 기준 파일 변화 0건이다** (2026-08-26 실측). v0.3.0 이 고친 것은
> 크로스카테고리 import 파손 8건인데, 그 8건에 플래너가 설치한 7개(`theme-puds`·`card`·`badge`·`input`·
> `skeleton`·`cn`·`donut`)가 **하나도 포함되지 않는다** — 7개 모두 두 버전 간 페이로드가 바이트 동일하다.
> 재설치해도 diff 가 안 나는 게 정상이니 "설치가 안 먹었다"고 오해하지 말 것. 바뀐 건 버전 핀뿐이다.

> ⚠️ **`/r/{name}.json` 을 서비스에서 직접 참조하지 마라.** 같은 호스트지만 `/r/` 은 **항상 main 최신**을
> 가리킨다 — 설치 시점마다 소스가 갈리고, 재설치 한 번으로 다른 버전이 조용히 들어온다.
> 서비스가 쓰는 경로는 `/v/<버전>/` 뿐이다. (호스트로 고정하려던 `puds-vX-Y-Z.vercel.app` 방식은
> Vercel `ssoProtection` 때문에 공개와 고정이 동시에 성립하지 않아 폐기됐다 — 2026-08-26)

```bash
bunx shadcn@latest add @puds/theme-puds          # 토큰 4종 → app/tokens/
bunx shadcn@latest add @puds/<name>              # 컴포넌트
```

- **토큰 재싱크 후 반드시 `--radius-*` → `--puds-radius-*` 리네임을 재적용한다.**
  `app/tokens/{_base,pullim-os,pullim-jr}.css` 3곳. `app/globals.css` 의 `@theme inline` 이
  `--radius-*: var(--puds-radius-*)` 로 별칭하므로 원본 이름 그대로면 자기참조가 된다.
  ```bash
  sed -i '' -E 's/--radius-(xs|sm|md|lg|xl|2xl|full):/--puds-radius-\1:/g' \
    app/tokens/_base.css app/tokens/pullim-os.css app/tokens/pullim-jr.css
  ```
- **`app/tokens/_animations.css` 는 벤더링만 하고 import 하지 않는다.** `tw-animate-css`(globals.css 에서 import)가
  이미 `animate-in/out` · `fade-*` · `zoom-*` · `slide-in-from-*-N` 을 제공하는 상위집합이다. 둘 다 import 하면
  같은 셀렉터에 규칙이 두 벌 생기고 뒤에 오는 PUDS 쪽(`animation-name: puds-enter`)이 이겨서, `--tw-enter-*` 를
  읽지 못해 현재 쓰이는 `slide-in-from-{right,left,top,bottom}-2`(16곳)의 슬라이드가 죽는다. (2026-08-26 실측)
- `donut.tsx` 는 레지스트리 `target` 이 `components/ui/charts/` 라 `shadcn add` 로 갱신되지 않는다 —
  `components/charts/README.md` 의 `curl` + `cp` 절차를 쓴다.

### ② 로컬 base-ui 프리미티브 — 교체 금지

- **엔진이 다르다.** 이 리포는 `@base-ui/react`, PUDS 프리미티브는 Radix. 공통 코드 0.
- `shadcn add @puds/dialog` 는 **덮어쓰기**라 `DialogBody`·`showOverlay` 를 쓰는 호출부 10개가 즉시 깨진다.
- `sonner.tsx` 는 PUDS `toast` 와 API 자체가 다르다(Provider+훅 vs `<Toaster/>`+`toast()`). 교체 금지.

**새 PUDS 컴포넌트를 들일지 판단하는 법** — 레지스트리 아이템의 `dependencies` 를 먼저 본다:

```bash
curl -s https://pullim-design-system.vercel.app/v/0.3.0/<name>.json \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('dependencies'),d.get('registryDependencies'))"
```

`@radix-ui/*` 가 나오면 **들이지 않는다**(엔진 혼재). 무의존이고 현재 호출부가 0건이면 도입 가능.
2026-08-26 기준 무의존: `card` · `badge` · `input` · `skeleton`. Radix 를 무는 것: `avatar` · `label` ·
`separator` · `tabs` · `scroll-area` · `sheet`.

### 버전 업그레이드 절차

1. `components.json` 의 `@puds` URL 에서 **경로의 버전만** 교체 — `/v/<이전>/` → `/v/<새 버전>/`
   (호스트는 그대로. 가용 버전은 PUDS 저장소 `docs/releases.md` 표 참조)
2. 레인 ① 아이템을 재설치 (`theme-puds` + 도입한 컴포넌트) · `donut` 은 `curl`+`cp`
   — `components/charts/README.md` 의 URL 도 같은 버전으로 맞춘다
3. `--puds-radius-*` 리네임 재적용
4. **`git diff` 리뷰** — 벤더링이라 재설치는 로컬 수정을 덮어쓴다. 의도치 않은 값 변화가 없는지 본다
5. `bun run typecheck` · `bun run test` · `bun run build` · 라이트/다크 양쪽 실 렌더 확인

### 그 외

```
lucide-react            ← 아이콘 (직접 import 허용)
sonner                  ← toast (직접 import 허용)
@base-ui/react          ← 프리미티브 엔진
```

- `cn` 은 `@/lib/cn`(PUDS 벤더링 원본) 또는 `@/lib/utils`(재export) 어느 쪽이든 동작한다.
  PUDS 컴포넌트는 원본 그대로 `@/lib/cn` 을 쓰고, 기존/신규 서비스 코드는 `@/lib/utils` 를 계속 쓴다.
- 상류 shadcn 컴포넌트가 필요하면 `bunx shadcn@latest add <name>` (레인 ②로 들어온다)

## 테마 — 성격 축과 명암 축은 별개다

| 속성 | 값 | 정하는 것 | 배선 |
|---|---|---|---|
| `data-theme` | `pullim-os` | 라운드·모션·그림자 | `app/layout.tsx` 가 고정 |
| `data-scheme` | `light`(기본) · `dark` | 표면·글자·경계 | `components/shell/theme-provider.tsx` (next-themes) |

- **다크를 `data-theme="dark"` 로 지정하면 성격 슬롯을 뺏어 테마가 통째로 풀린다.** 반드시 `data-scheme`.
- 컴포넌트에 `dark:` 유틸리티를 새로 쓰지 마라 — 의미 토큰(`bg-card`·`text-foreground`·`border-border`)만
  참조하면 명암이 자동으로 따라온다. (`dark:` 는 `[data-scheme="dark"]` 에 물려 있긴 하다)
- 레거시 `pullim-slate-*` / `pullim-*-bg` 램프는 `app/globals.css` 의 `--pl-*` 우회 변수를 거쳐
  `[data-scheme="dark"]` 에서 반전된다. **`@theme inline` 에서 `--color-gray-*` 를 직접 가리키지 마라** —
  값이 유틸리티에 인라인돼 버려 뒤집을 수 없게 된다.
- **다크 기본값은 `light`.** 브랜드 램프(`pullim-blue-*`, 약 370곳)가 아직 명암을 따라가지 않아
  `text-pullim-blue-700`(98곳)이 다크에서 대비 2.5:1 이고 `bg-pullim-blue-50`(72곳)이 밝은 블록으로 남는다.
  이 램프를 의미 토큰으로 옮기는 것이 다크를 기본으로 켜기 전 남은 작업이다.

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
