# This is NOT the Next.js you know

This version (Next.js 16) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# AGENTS.md

> AI 코드 리뷰 에이전트(Codex 등)가 PR을 리뷰할 때 참고하는 가이드라인.

## 앱 개요
- 학생용 학습 플래너 — Next.js 16 App Router, 단일 앱 리포 (모노레포 아님). dev port 3006
- BE: **pullim-api** (별도 리포) — 세션(쿠키 SSO + CSRF)·planner 데이터 모두 pullim-api. 이 리포에 BE 코드 없음 (구 apps/backend 는 2026-07-31 폐기)
- 인증: `lib/auth/auth-context.tsx` + `lib/api-client/` (쿠키 세션). dev 화면 확인은 `NEXT_PUBLIC_DEV_AUTH_BYPASS=1` + localhost
- i18n: 미도입 (한국어 하드코딩 허용)
- UI: 3레인 — ① PUDS 원격 벤더링(`app/tokens/*`·`lib/cn.ts`·일부 `components/ui/*`·`components/charts/donut`) ② 로컬 base-ui 프리미티브(`components/ui/*`) ③ 서비스 고유. DS npm 패키지 미사용 (Must Fix §1)
- 테마: `data-theme="pullim-os"`(성격, layout.tsx 고정) + `data-scheme="light|dark"`(명암, next-themes). 기본 light
- 관측: Sentry / `@pullim/analytics` / `@pullim/remote-config` 미도입. `@vercel/analytics` 도입 완료 (`app/layout.tsx` `<Analytics />`, `track()` 허용)
- 상태: useState (UI), Container 내부에서 상태/핸들러 직접 관리
- 도메인 권위: `input/docs-archive/08_풀림_플래너_핸드오프.md`

## 디렉터리 구조 (src/ 없음 — 리포 루트 직속)

```
pullim-planner/
├── app/                                # App Router (Container import + Suspense)
│   ├── tokens/                         # PUDS 토큰 벤더링 — 로컬 수정 금지
│   └── (student)/                      # 플래너 라우트 그룹
├── components/
│   ├── ui/                             # 프리미티브 — 3레인 혼재 (Must Fix §1 판별표)
│   ├── charts/                         # PUDS 차트 벤더링 (donut)
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
│   ├── cn.ts                           # PUDS 벤더링 (@puds/cn)
│   └── utils.ts                        # cn 재export
├── __tests__/                          # Jest 단위 테스트
└── package.json · jest.config.ts · tsconfig.json
```

---

## Must Fix (병합 차단)

### 1. UI 컴포넌트 소스 — 3레인

UI 소스는 세 갈래이고 **레인마다 규칙이 다르다.** 전체 판별표·설치 절차는 `CLAUDE.md § UI 컴포넌트`.

| 레인 | 파일 | 규칙 |
|---|---|---|
| ① **PUDS 원격 벤더링** | `app/tokens/*.css` · `lib/cn.ts` · `components/ui/{card,badge,input,skeleton}.tsx` · `components/charts/donut.tsx` | ❌ **로컬 수정 금지** — 직접 고치는 PR 은 반려. PUDS 저장소에서 고치고 재설치한다 |
| ② **로컬 base-ui 프리미티브** | `components/ui/{button,dialog,sheet,tabs,avatar,label,separator,scroll-area,dropdown-menu,tooltip,progress}.tsx` | ❌ **PUDS 프리미티브로 교체 금지** (수정 자체는 자유) |
| ③ **서비스 고유** | `components/ui/{meta-row,sonner}.tsx` · `app/os-topbar.css` · `components/{shell,features,shared,brand}/*` | 자유 |

- ✅ 허용 import: `@/components/ui/*` · `@/components/charts/*` · `@base-ui/react` · `@/lib/cn` · `@/lib/utils` · `lucide-react` · `sonner`
- ❌ 금지 import: `@pullim/design-system/*`, `@pullim/ui`, `@radix-ui/*`, MUI / FontAwesome 등 미설치 패키지
  — `@radix-ui/*` 는 **이 리포에 설치돼 있지 않다**는 뜻이다(`package.json` 의 프리미티브 의존성은 `@base-ui/react` 하나, 소스 import 0건).
  PUDS 가 Radix 를 문다는 뜻이 **아니다** — v0.5.0 부터 PUDS 도 Radix 를 쓰지 않는다.
- ❌ DS npm 패키지 미설치 — PUDS 는 의존성이 아니라 `components.json` 의 `@puds` 레지스트리에서 **소스를 복사**해 온다

**레인 ② 를 PUDS 로 갈아끼우지 않는 이유** — 규칙은 그대로지만 **근거가 바뀌었다.**

옛 근거는 "엔진이 다르다(이 리포는 Base UI, PUDS 는 Radix)"였다. **그 근거는 죽었다.**
PUDS v0.5.0(2026-08-28)이 `@radix-ui/*` 24개와 `cmdk` 를 전부 걷어내 **이제 양쪽 다 `@base-ui/react`** 다.
0.4.x 까지는 맞는 말이었다. 지금은 아니다 — **엔진 혼재를 이유로 들지 마라.**

살아 있는 근거 둘, 둘 다 엔진과 무관하다:

1. **`files[].target` 이 겹친다 — 레인 ② 11종 전부.** PUDS 의 `avatar`·`button`·`dialog`·`dropdown-menu`·
   `label`·`progress`·`scroll-area`·`separator`·`sheet`·`tabs`·`tooltip` 은 target 이 모두
   `components/ui/<name>.tsx` 다. `shadcn add` 는 **덮어쓰기**라 레인 ② 에 쌓아 둔 로컬 수정이 말없이 사라진다.
2. **API 가 다르다.** PUDS v0.5.0 `dialog` 의 export 에 `DialogBody` 가 없고 `DialogContent` 에
   `showOverlay` prop 이 없다. 둘 중 하나 이상을 쓰는 feature 파일이 **7개**다 — 덮는 즉시 깨진다.

`proc/plan/2026-07-01_planner-puds-full-reskin.md` 의 "Base UI→Radix 엔진 교체는 안 함"은
**바꿀 Radix 자체가 없어져 문장이 무효**가 됐다. 같은 줄의 상위 원칙("엔진·API·호출부·의존성 불변")은
그대로 유효하다. **이 결정을 다시 볼지는 사람이 정한다 — 에이전트가 뒤집지 마라.**

**새 PUDS 컴포넌트 도입 판정 — 검사 둘을 병행한다. 하나만 보면 어느 쪽으로든 fail-open 된다.**

| | 무엇을 보나 | 통과 못 하면 왜 위험한가 |
|---|---|---|
| ① **`files[].target` 충돌** | 이 리포의 기존 파일을 덮는가 | 레인 ②·③ 에 쌓아 둔 로컬 수정이 **에러 없이 사라진다** |
| ② **미설치 의존성** | `dependencies` 에 이 리포에 **없는 패키지**가 있는가 | `package.json` 은 § 4 수정 금지 영역이다 — 설치가 필요하면 그 자체가 별건 승인 사항 |

**둘 다 `registryDependencies` 전이까지 본다.**

> ⛔ 옛 기준(`dependencies` 에 **`@radix-ui/*` 가** 있으면 도입 불가)은 **폐기.** v0.5.0 은 93개 아이템 전부
> 해당 없음이라 아무것도 막지 못한다(fail-open). **다만 폐기된 것은 "Radix 만 보던 좁은 범위"이지
> 의존성 검사 자체가 아니다** — 대상을 **「이 리포에 아직 설치되지 않은 패키지 전부」로 넓혀** ② 로 남겼다.
> **좁히지 말고 넓혀라.**

두 검사가 서로를 대신하지 못한다는 것을, 작성 시점에 고정돼 있던 릴리스(v0.5.0)가 실제로 보여 준다
(2026-08-31 실측 — 핀이 올라가면 다시 돌려 볼 것):

| 아이템 | ① target | ② 의존성 | 판정 |
|---|---|---|---|
| `scroll-area` | ⛔ `components/ui/scroll-area.tsx` 를 덮는다 | ✅ 통과(`@base-ui/react` 는 설치돼 있다) | **불가** — ② 만 보면 놓친다 |
| `data-table` | ✅ 전부 신규 | ⛔ `@tanstack/react-table` 미설치 | **불가** — ① 만 보면 놓친다 |

명령은 `CLAUDE.md § UI 컴포넌트` 의 스크립트를 쓴다. 판정은 **세 갈래**이고, 통과는 하나뿐이다:

| 판정 | 뜻 |
|---|---|
| `도입 가능` | 두 검사 다 통과 — 유일한 통과 |
| `도입 불가` | 기존 파일을 덮거나(또는 경로가 달라 **사본이 하나 더 생기거나**) 미설치 의존성이 있다 |
| `판정 불가` | `registryDependencies` 의 이름을 얻지 못했다(레지스트리에 없는 이름, URL 표기) — **통과가 아니다.** 손으로 확인한다 |

> **`판정 불가` 를 `도입 가능` 으로 접지 마라.** 이 판별기의 실패 모드는 fail-open 이라
> 「모르겠다」를 「괜찮다」로 읽는 순간 전이 의존과 target 충돌을 놓친다.

> **`donut` 은 target 이 `components/ui/charts/` 인데 이 리포는 `components/charts/` 로 관리한다.**
> `shadcn add` 는 기존 파일을 갱신하는 대신 **사본을 하나 더 만든다** — 스크립트가 이 자리를
> `⛔ 사본 생성` 으로 잡는다. 갱신은 `components/charts/README.md` 의 `curl` + `cp` 절차로 한다.

`components.json` 의 `@puds` URL 은 **경로로 버전 고정**돼 있다 — `…vercel.app/v/<버전>/{name}.json`.
**현재 어느 버전인지는 `components.json` 이 유일한 정본이다** — 이 문서에 옮겨 적지 않는다(박아 두면
핀이 올라가는 순간 낡는다). 확인은 `jq -r '.registries["@puds"]' components.json`.
`/v/<버전>/` 은 PUDS 저장소 `registry-releases/<버전>/` 에 커밋된 스냅샷이라 main 에 무엇이 푸시돼도 변하지 않는다.

❌ **`/r/{name}.json` 으로 바꾸는 변경은 반려.** 같은 호스트지만 `/r/` 은 **항상 main 최신**을 가리켜
설치 시점마다 소스가 갈린다. 업그레이드는 **경로의 버전만** 교체(`/v/<이전>/` → `/v/<새 버전>/`)한 뒤
재설치 + `git diff` 리뷰. `components/charts/README.md` 의 URL 도 같은 버전으로 맞춘다.

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
  — 이 토큰들이 PUDS 명암 축(`data-scheme`)을 자동으로 따라간다. 고정 명도 램프(`text-pullim-slate-900` 등)는
  `--pl-*` 우회로 반전은 되지만 신규 코드에는 의미 토큰을 쓴다
- 다크는 `data-scheme`(속성) 축 하나뿐. **`data-theme="dark"` 금지**(성격 슬롯을 뺏어 테마가 풀린다),
  `.dark` 클래스 축도 폐기. 새 `dark:` 유틸리티도 지양 — 의미 토큰이면 자동으로 따라온다
- `cn` 유틸: `@/lib/utils` (PUDS 벤더링 컴포넌트는 원본대로 `@/lib/cn` — 같은 구현)
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
