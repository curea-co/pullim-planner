# pullim-planner → PUDS 디자인 시스템 정합 — 설계(Design)

> 2026-07-04 · 상태: brainstorming 합의 → 구현계획 대기
> repo: `pullim-planner` (bun workspace 모노레포, `apps/planner` = Next.js 16 FE)
> 참조 표준: `pullim-writing-coach` · `pullim-admissions-coach` (둘 다 PUDS `pullim-os` 토큰 소비)
> 권위 토큰 원본: `pullim-design-system/packages/tokens/{_base.css, pullim-os.css}` (코치 vendored 사본과 **동일**)

## 목표

풀림 플래너(`apps/planner`)를 라이팅 코치 · 어드미션 코치와 **동일한 디자인 시스템(PUDS `pullim-os`)** 위에서 렌더되게 한다. 같은 블루(hue-258), 같은 중립 그레이 램프, 같은 radius/density/shadow/motion, 그리고 코치와 동일한 셸 크롬(헤더 + 좌측 레일 + 모바일 탭바) 합성을 갖게 한다. **컴포넌트 레지스트리 마이그레이션 없이**(= `@puds/*` shadcn add 미사용), 토큰 재지정과 셸 리스킨만으로 달성한다.

## 배경 사실 (탐색 결과)

- **코치 2종은 이미 정합**: `pullim-writing-coach`, `pullim-admissions-coach` 모두 `app/tokens/_base.css` + `pullim-os.css`를 `@import`하여 PUDS 토큰을 소비한다. 두 파일은 `pullim-design-system/packages/tokens/`의 canonical 원본과 byte-identical.
- **플래너만 이탈(drift)**: `apps/planner/app/globals.css`는 자체 `@theme inline` 토큰 블록(브랜드 블루 `#3B6FF6`, 자체 radius/shadow/dark)을 갖는다. 코치의 PUDS 블루(hue-258, `#0362da` 계열)와 다르다.
- **회귀 표면이 넓다**: 플래너 컴포넌트 100+ 파일이 `globals.css`에 정의된 이름에 의존 — `pullim-slate`(73), `pullim-blue`(55), `ring`(71), `card`(51), `pullim-warn`(26), `pullim-success`(18), `pullim-danger`(17), `muted`(11), `accent`(10), `destructive`(8), `pullim-lemon`(8) 등.
- **다크모드 비활성**: `next-themes`는 `components/ui/sonner.tsx`만 import. ThemeProvider 없음, `<html>`에 `.dark`/`data-theme` 미부여. 앱은 사실상 라이트 단일로 동작하고 `.dark` 블록은 휴면 상태.
- **코치 셸 청사진 존재**: `pullim-writing-coach/docs/superpowers/specs/2026-06-24-writing-coach-puds-shell-design.md` + `app/components/app-shell.tsx`. 합성 = `DashboardShell`(헤더 60px + 좌측 레일 + 모바일 탭바) · `OsRail`(head + items) · `OsTabbar`(모바일) · `ServiceIcon`(브랜드 로고) · `page-header`. 이 컴포넌트들은 PUDS 레지스트리(`@puds/*`) 산출물.

## 결정 (brainstorming 합의, 2026-07-04)

1. **대상 = `apps/planner`.** "the saas" = 이 리포의 플래너.
2. **스코프 = 토큰/테마 정합 + 셸/레이아웃 정합.** 전면 PUDS 레지스트리 채택(= `@puds/*` 설치)은 하지 않음.
3. **브랜드 블루 = 코치 블루 채택.** 플래너 `--color-pullim-blue-*`를 PUDS `pullim-os` primary 램프(hue-258)로 재지정 → 55개 blue 사용 파일이 코치 블루로 이동. 이것이 "일관성"의 핵심.
4. **이름 보존 토큰 브릿지(name-preserving bridge).** 기존 토큰/유틸 **이름은 전부 유지**, **값만** PUDS 원본으로 재지정. 컴포넌트 파일은 테마 스왑을 위해 **편집하지 않는다**(100+ 파일 회귀 방지). 전면 대체(코치 globals 통째 이식 + 이름 폐기)는 명시적으로 **기각** — 100+ 파일 mass find/replace 비용이 이득을 초과.
5. **풀 셸 리스킨(hand-mirror).** 플래너 자체 셸 컴포넌트(`app-shell`/`app-header`/`app-sidebar`/`bottom-nav`/`breadcrumb`)를 코치 `DashboardShell`/`OsRail`/`OsTabbar` **합성을 시각적으로 미러링**하도록 재작성. **PUDS 레지스트리 컴포넌트는 설치하지 않는다**(components.json 레지스트리 설정 · package.json 변경 회피). → 코치와 컴포넌트를 *공유*하는 게 아니라 *손으로 미러링*. 트레이드오프: 향후 드리프트 가능(진짜 공유가 필요하면 별 트랙 "전면 PUDS 채택").
6. **다크 블록 = 휴면 유지.** `.dark` 블록 값만 PUDS gray-950 계열로 재테마(패리티용). 테마 토글 배선은 스코프 밖.
7. **FE 단독 = 단일 PR.** `apps/planner`만 변경 → 리포 최상위 규칙("FE/BE 혼합 금지") 준수.

## 변경 상세

### 1. 토큰 파일 vendored 반입
- `apps/planner/app/tokens/_base.css` + `pullim-os.css` 신규 — `pullim-design-system/packages/tokens/`에서 **verbatim 복사**(코치와 동일 방식, DS npm 의존성 없음 → CLAUDE.md "DS 패키지 미설치" 규칙 준수).
- **주의(코치 knowhow)**: PUDS `_base.css`의 CDN 폰트 `@import url(...)` 라인은 Turbopack dev 500을 유발할 수 있음. 플래너는 이미 `globals.css`에서 Pretendard CDN을 `@import`하므로, vendored `_base.css`에서 중복 폰트 `@import` 라인은 제거(로컬 픽스, classbot/writing-coach와 동일).

### 2. `app/globals.css` 재작성 — 이름 보존 브릿지
- 최상단: `@import "tailwindcss";` → `@import "./tokens/_base.css";` → `@import "./tokens/pullim-os.css";` (순서 중요).
- 테마 활성화: `<html data-theme="pullim-os">` 정적 지정(§3 layout.tsx). `pullim-os` 램프(primary/lemon/radius/density)가 실제 적용되려면 이 attribute 필수.
- `@theme inline` 브릿지 — 플래너 기존 계약 이름을 PUDS 토큰에 바인딩:
  - **shadcn 시맨틱 → PUDS**: `--color-background`←`--surface-canvas`, `card`/`popover`←`--surface-raised`, `foreground`←`--text-primary`, `muted`←`--surface-sunken`, `muted-foreground`←`--text-tertiary`, `primary`←`--color-primary-600`, `primary-foreground`←`#fff`, `secondary`←`--surface-sunken`(중립 버튼), `border`/`input`←`--border-default`, `ring`←`--color-primary-600`, `accent`←`--color-primary-50`, `accent-foreground`←`--color-primary-700`, `destructive`←`--color-danger-600`, `sidebar-*`←surface/primary, `chart-1..5`←primary 램프.
  - **플래너 브랜드 팔레트 재도출(이름 유지)**: `--color-pullim-blue-{50..950}`←PUDS `--color-primary-{50..950}`(hue-258); `--color-pullim-slate-*`←PUDS gray 램프; `--color-pullim-lemon*`←PUDS lemon(`--color-secondary-500`); `--color-pullim-success/warn/danger*`←PUDS status 램프; `heat/lvl/violet/teal` 보조색은 primary/status 램프에서 유지·정합.
  - **radius/shadow/motion**: `--radius-*`를 `pullim-os` sharp 스케일로(예: md 10px→8px); shadow/duration/ease를 PUDS 값으로.
- 도메인 애니메이션(`score-bar`, `feedback-flash` 등)·`@layer components`(dual-range 등)·reduced-motion 가드는 유지.

### 3. 셸 리스킨 (코치 합성 미러링)
- `layout.tsx`: `<html ... data-theme="pullim-os">`; `viewport.themeColor` `#3B6FF6`→PUDS 블루; 기존 Provider(`AuthProvider`/`TooltipProvider`/`Toaster`/`Analytics`) 유지.
- `components/shell/app-shell.tsx`: 코치 `DashboardShell` 합성으로 재작성 —
  - **헤더** 60px sticky, `--surface-raised` bg, border-b `--border-default`; 좌측 브랜드(로고 + "풀림" 17px extrabold + "플래너" 중립 pill) + 우측 actions.
  - **좌측 레일**(데스크톱): 코치 `OsRail`(head + items) 미러 — 접기/펼치기 + persist. 플래너 `nav-config.ts`의 `plannerSection`/`studentBottomTabs` 데이터를 그대로 소비.
  - **본문**: `max-w-[1180px]` px-6 py-8 pb-24(모바일)/pb-8; breadcrumb 바 유지 여부는 구현 시 코치 대비 확인(코치는 page-header 사용).
  - **모바일 탭바**: 코치 `OsTabbar` 미러 — `studentBottomTabs` 소비.
- `app-header.tsx`/`app-sidebar.tsx`/`bottom-nav.tsx`/`breadcrumb.tsx`: 위 합성에 맞춰 마크업·메트릭(높이/radius/색) 리스킨. 플래너 mock 인증(`@/lib/auth/auth-context`)은 유지(코치의 SSO HeaderActions는 미도입 — 플래너 인증 컨텍스트에 맞게 헤더 우측 슬롯 구성).
- `nav-config.ts` 데이터 구조는 유지(라우트·라벨 변경 없음).

### 4. 컨벤션 문서 갱신
- `apps/planner/CLAUDE.md`의 "`@pullim/design-system` 미사용 — 별 트랙" 서술을 갱신: PUDS **토큰**은 vendored 소비하되 **DS npm 패키지/레지스트리 컴포넌트는 여전히 미설치**임을 명확화. (레지스트리 미채택이라 "DS 패키지 import 금지" 규칙 자체는 유지.) 이 문서 편집은 글로벌 작업이나, 본 요청이 해당 컨벤션을 명시적으로 이행하므로 본 작업에 번들.

## 검증
- `bun --filter @pullim-planner/planner typecheck` · `lint` · `test`(Jest) 그린.
- `bun run dev:planner`(port 3030) 스모크: 홈 / 리포트 / 시간표 관리 위저드 / 셸을 코치 1종과 나란히 비교 — 블루·중립·radius·헤더/레일/탭바 합성 패리티 육안 확인. CSS import 순서 에러 없음.

## 스코프
- vendored PUDS 토큰 반입 + 이름 보존 브릿지 globals 재작성 + 셸 5종 리스킨 + layout.tsx theme 배선 + CLAUDE.md 갱신 + 검증. FE 단독 단일 PR.

## 비범위 (YAGNI)
- `shadcn add @puds/*` 레지스트리 컴포넌트 마이그레이션 · DS npm 의존성 · 라이브 다크 토글 · BE 변경 · 코치 리포 변경 · 라우트/IA 변경.

## 위험 / 유의
- **회귀 표면(100+ 파일)**: 이름 보존 브릿지로 컴포넌트 편집 0을 목표. 브릿지에서 누락된 계약 이름(예: 특정 `pullim-*` 변주, chart-*)이 있으면 해당 유틸이 무효화되므로, 재작성 후 globals의 정의 이름 집합 ⊇ 코드 참조 이름 집합을 확인.
- **`data-theme` 활성 필수**: `pullim-os` primary 램프가 attribute 없이는 미적용 → primary undefined 회귀. layout.tsx 정적 지정 확인.
- **PUDS `_base.css` 폰트 @import**: dev 500 회피 위해 vendored 사본에서 제거(§1).
- **셸 리스킨 diff 규모**: 셸 5종 마크업 재작성은 회귀 표면이 큼 — dev 스모크로 반응형(모바일 탭바/데스크톱 레일) 각각 확인.
- **다크 휴면**: `.dark` 재테마는 패리티용일 뿐 토글 미배선 — 라이트 강제 유지.
