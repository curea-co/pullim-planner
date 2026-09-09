# 플래너 셸·홈 PUDS 리프레시 — 설계(Design)

> ⚠️ **2026-09-04 — 셸 레일·탭바 축은 이 문서가 더 이상 정본이 아니다 (PR #236).**
> 이 문서의 참조 정본은 아래에 적힌 대로 **형제 앱 3종의 PUDS 셸 킷**이었고, 거기서 온 값이
> `md` 64px 축약 · `lg` 접힘 68px · 레일 경계 28px 원형 셰브론 · bottom-nav 모바일 전용이다.
> 사용자 지시(2026-09-04 — "pullim-os 에 맞게")로 **셸 정본이 pullim-web `/os` 로 바뀌었다**
> (`pullim-web/src/styles/os-tokens.css`). 그 결과 아래 항목들은 **폐기**됐다:
>
> | 이 문서가 정한 것 | 현행 (PR #236) |
> |---|---|
> | `md` 64px 축약 레일 | 없음 — 920px 까지 248px 유지 |
> | `lg` 접힘 68px 아이콘 레일 | 접으면 레일을 렌더하지 않음 (정본 `display:none`) |
> | 레일 경계 28px 원형 셰브론 (`left-[248px]`↔`left-[68px]`) | topbar 첫 자식 34px 사각 버튼 (정본 `.rail-collapse-btn`) |
> | md/lg 혼용 브레이크포인트 | **920px 한 지점** (`--breakpoint-os`) |
> | bottom-nav 모바일 전용 · 비범위 | ~920px 에서 노출 · `fixed` 62px+safe-area |
>
> **살아 있는 것**: 사이드바 아이템 시각(`rounded-[11px]` · primary-50 틴트 · 3px 좌측 액센트 바),
> `localStorage['puds-rail-collapsed']` 영속, 홈 히어로 3D, 그 밖의 홈 본문 규정.
> 정본이 형제 앱(PUDS 셸 킷)과 OS 로 갈려 있다는 사실 자체는 남는다 — 다시 뒤집을 근거가
> 생기면 이 표를 보고 되돌리면 된다.

> 2026-07-06 · 상태: brainstorming 합의 → 구현계획 대기
> repo: `pullim-planner` `apps/planner` (FE 단독 PR — FE/BE 분리 규칙 준수). 브랜치 base = `origin/dev` (배포 브랜치).
> 참조 정본: 문제Q(`pullim-Q/apps/q`) · 입시코치(`pullim-admissions-coach/apps/web`) · 라이팅코치(`pullim-writing-coach`) — 세 앱 공통 PUDS 셸 킷.

## 배경 (서베이 결과)

세 형제 앱은 동일한 셸 시그니처를 공유한다:
1. **사이드바**: mono 대문자 눈썹 라벨 + 플랫 아이템 리스트, `rounded-[11px]`, 활성 = primary-50 틴트 + primary semibold + 3px 좌측 액센트 바, 펼침 248~256px ↔ 접힘 68px (`transition-[width] duration-200`).
2. **접기 토글**: 사이드바 우측 경계선에 걸친 28px(`h-7 w-7`) 원형 셰브론 버튼(lg 전용), 접히면 `rotate-180`, hover 시 파랑. 상태는 `localStorage['puds-rail-collapsed']`('1'/'0') 영속, `useState` + mount `useEffect` 하이드레이션.
3. **홈 히어로**: `pullim-blue-700→900` 그라디언트 패널(rounded-xl) + **순수 CSS 3D**(라이브러리 0): `[perspective:~1100px]` 컨테이너 + `[transform-style:preserve-3d]` 스택에 카드 3장을 `translateZ` 깊이별 배치, 부모 스택만 9~11s 틸트 키프레임 진동, `prefers-reduced-motion` 시 정적 틸트 고정, `hidden sm:block`, `aria-hidden`.
4. **레이아웃**: 콘텐츠 max-w 1180px. (플래너만 1280px)

플래너 현황: 아이템 스타일(11px radius·3px 바)은 이미 정합. 델타 = ① 접기 토글 없음, ② 눈썹 라벨 없음 + 도메인>자식 2단 인덴트 구조, ③ 홈 히어로 없음, ④ max-w 1280.
폰트(Pretendard + Geist Mono)는 이미 Q와 동일 — 변경 없음.

## 결정 (2026-07-06 합의)

1. **사이드바 플랫 재편.** 도메인>자식 인덴트를 버리고 mono 눈썹 `풀림 플래너` + `plannerSection` 플랫 리스트로. 단일 도메인 앱이라 2단 구조가 사실상 불필요.
2. **접기 토글 추가.** Q 패턴 그대로: `AppShell`이 `useState` + `localStorage['puds-rail-collapsed']` 소유, lg 전용 28px 원형 셰브론이 레일 폭을 따라 이동(`left-[248px]` ↔ `left-[68px]`).
3. **홈 히어로 = D-Day 밴드 승격(대체 — 신규 컴포넌트).** `/planner` 홈 상단(모든 뷰 공통)에 컴팩트 그라디언트 히어로: 눈썹 + `{examName} D-{n}` 헤드라인 + 오늘/주간 스탯, 우측에 시간블록 카드 3장 CSS 3D 플로트. `BurnoutThresholdBanner`는 유지. `DDayHeaderBand`는 **히어로가 완전 흡수·대체**한다 — 직전 구간(today/critical, ~D-6) 권유 카피(11-planner-design § 2.1)를 히어로 안 `role="status"` 라인으로 노출하고 노출 조건은 `shouldShowDDayHeaderBand` 헬퍼를 그대로 재사용해 보존. *(초안은 "밴드 유지 + 히어로 추가"였으나 PR #123 리뷰에서 시험명·D-Day 이중 노출 지적 → 흡수·대체로 확정, 2026-07-07)*
4. **max-w 1280 → 1180** (`AppShell CONTENT_MAX`).

## 변경 상세

### 1. 사이드바 플랫 재편 — `components/shell/app-sidebar.tsx`
- 눈썹: `px-2 pt-3 pb-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-tertiary)]`, 텍스트 `풀림 플래너`. 접힘/compact 시 숨김.
- 아이템: `plannerSection`을 플랫 렌더. 기존 활성 스타일(3px 바 + primary-50 틴트 + semibold) 유지. 활성 판정 = 최장 prefix 매치(기존 `findActiveSubHref` 로직 재사용).
- 폭 3단: md compact 64px(기존 유지, 아이콘 전용) / lg 펼침 248px / lg 접힘 68px(아이콘 전용, 42px 정사각 중앙정렬). `transition-[width] duration-200`.
- `collapsed` prop 추가(lg 접힘). 기존 `compact` prop(md)과 별개.
- `studentDomains`/`findActiveSection` 등 nav-config 다른 소비자(breadcrumb·bottom-nav·mobile-drawer)는 손대지 않는다.

### 2. 접기 토글 — `components/shell/app-shell.tsx`
- `AppShell`을 `'use client'`로 전환(Q와 동일 — children은 서버 렌더 유지).
- 상태: `const RAIL_KEY = 'puds-rail-collapsed'` + `useState(false)` + mount `useEffect`에서 `localStorage` 읽기(try/catch), 토글 시 저장.
- 버튼: `hidden lg:flex absolute top-5 z-30 h-7 w-7 -translate-x-1/2 rounded-full border bg-card shadow-md`, `left-[248px]` ↔ `left-[68px]`, 셰브론 `m15 6-6 6 6 6` + `collapsed && rotate-180`, hover 파랑, `aria-expanded` + `aria-label` "사이드바 접기/펼치기".
- aside 폭: `md:w-16` 유지, lg는 `collapsed ? lg:w-[68px] : lg:w-[248px]`.

### 3. 홈 히어로 — `components/features/planner-home/components/`
- **`home-hero.tsx`** (신규): `rounded-2xl bg-gradient-to-br from-pullim-blue-700 to-pullim-blue-900 text-white overflow-hidden relative` 패널. 좌측: mono 눈썹 `PULLIM PLANNER`(lemon 액센트 dot), 헤드라인 `{examName}` + D-Day(큰 숫자), 서브라인 `오늘 n/m 블록 완료 · 이번 주 Nh`. 우측: `<HeroMotion3D />`. 높이 컴팩트(내용 기준, 데일리 툴 밀도 유지).
- **`hero-motion-3d.tsx`** (신규): `aria-hidden`, `hidden sm:block absolute inset-y-0 right-0 [perspective:1100px]`. 내부 `[transform-style:preserve-3d]` 스택이 `animate-[planner-hero-tilt_10s_ease-in-out_infinite]`, `motion-reduce:animate-none motion-reduce:[transform:rotateY(-14deg)_rotateX(6deg)]`. 시간블록 미니 카드 3장(시간 라벨 + 과목 바 + lemon 체크 액센트)을 `translateZ(-46px)/0/48px` + 소폭 rotate로 배치, 각 카드 스태거 플로트.
- **`app/globals.css`**: `@keyframes planner-hero-tilt`(rotateY -20↔16deg, rotateX 9↔2deg) + 플로트 키프레임 추가.
- **`presenters/HomePresenter.tsx`**: 최상단(기존 `DDayHeaderBand` 자리), `BurnoutThresholdBanner` 앞에 `<HomeHero examName dday daySummary weekMeta />` 렌더. `DDayHeaderBand` 렌더·컴포넌트 파일은 제거(히어로가 흡수 — 결정 3). 필요한 props는 전부 기존 시그니처에 존재 — Container 변경 없음.

### 4. 레이아웃 — `app-shell.tsx`
- `CONTENT_MAX`: `max-w-[1280px]` → `max-w-[1180px]`.

## 검증
- Jest: 신규 — 사이드바 플랫 렌더(눈썹 + 전 항목) / 접기 토글 localStorage 영속 / HomeHero 렌더(examName·D-Day 노출, 3D `aria-hidden`). 기존 스위트 그린 유지.
- `typecheck` · `lint` · `build` 통과.
- dev(3030) 스모크 스크린샷: 펼침/접힘 사이드바, 홈 히어로 3D.

## 비범위 (YAGNI)
- 헤더(OS topbar)·bottom-nav·mobile-drawer·breadcrumb 변경.
- 달력 대시보드(일/주/월 뷰) 본문 재디자인, 폰트 교체(이미 정합).
- 다크 테마(형제 앱 전부 라이트 단일).
- BE·mock 데이터 구조 변경.

## 위험 / 유의
- `AppShell` 클라이언트 전환: children 서버 렌더는 유지되나 layout 경로라 hydration 회귀 주의 — Q에서 검증된 동일 패턴.
- 사이드바 플랫 재편 시 nav-config의 다른 소비자(breadcrumb 등)와 활성 판정 어긋나지 않게 `findActiveSubHref` 로직 보존.
- REPORTS/ROUTINE 플래그 조건부 항목이 플랫 리스트에서도 동일하게 조건 렌더돼야 함.
- 히어로가 홈 세로 공간을 잠식하지 않도록 컴팩트 유지(3D는 absolute, 패널 높이는 텍스트 기준).
