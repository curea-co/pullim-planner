# Audit #9 — Mobile UI 종합 감사 (1 PR atomic)

## 목표
풀림 플래너 모바일 viewport(375px)에서 horizontal overflow / cut-off / 진입 동선 단절을 일괄 정리한다. 화면 역분석 슬라이드([proc/research/2026-05-18_screen-design-rationale.html](../research/2026-05-18_screen-design-rationale.html)) 작성 직후 사용자가 "시간표가 모바일에서 엉망 + 하단 내비게이터 엉망" 명시 → 전체 8건 1 PR 통합으로 진행.

## 배경
- audit Top #9 — 슬라이드로 mobile 캡처 14장 동시 본 결과 모바일 결함 분포가 시각화됨
- 4일 연속(audit #5/#6/#7/#8) 풀스택 cadence 유지하되, 이번은 **종합 audit**으로 1 PR 8건 묶음 — 사용자 선정(전체 8건 통합 + 1 PR 아트믹)
- 결함은 desktop에서 보이지 않음 — `xl:grid-cols-[420px_1fr]` 같은 desktop-first layout이 모바일 fold 시 미세 결함을 누적
- mobile 캡처 출처: `https://pullim-planner.vercel.app` PR #15 시점 (Chrome headless 375×812, user-agent iPhone)

## 작업 항목

### 1단계 — 갭 분석 (완료)

#### 1.1 결함 매트릭스 (8건)

| # | 영역 | 위치 | 결함 | 강도 | 작업량 | 추천 |
|---|---|---|---|---|---|---|
| 1 | CalendarShell nav | [calendar-shell.tsx:76,79-111](src/components/planner/calendar-shell.tsx#L76) | `flex-wrap` + `ml-auto` 우측 nav 동시 노출 시 overflow. mobile에서 토글 + navLabel + prev/next가 한 줄에 들어가지 못함 | 🔴 | 13m | ★★★ |
| 2 | BottomNav | [nav-config.ts:71-74](src/components/shell/nav-config.ts#L71), [bottom-nav.tsx:20](src/components/shell/bottom-nav.tsx#L20) | 2탭(홈/플래너)만 — manage·reports·onboarding 진입 동선 mobile에서 단절. `grid-cols-5`인데 탭 2개라 빈 슬롯 3개 | 🔴 | 9m | ★★★ |
| 3 | PageHeader action | [page-header.tsx:38,58](src/components/shell/page-header.tsx#L38) | `flex-wrap`은 있으나 title이 90% 폭 차지 → action `shrink-0`이 우측 edge로 밀려 cut-off. reports "부모님께 보내기" 버튼이 캡처상 일부만 보임 | 🟡→🔴 | 11m | ★★★ |
| 4 | PlannerCard sub | [planner-card.tsx:203](src/components/planner-manage/planner-card.tsx#L203) | `truncate text-[10px]` → "math, english, scie..." 정보 손실. mobile grid-cols-2 셀 너비 ~150px가 모든 길이 sub 잘림 | 🟡 | 8m | ★★ |
| 5 | NextBlock CTA | [day-view.tsx:106-140](src/components/planner/views/day-view.tsx#L106) | 3-column flex (icon + 텍스트 + "지금 시작") 좌측 icon 9px badge + 중앙 정보 + 우측 CTA 버튼이 mobile에서 spacing 손실 | 🟡 | 10m | ★★ |
| 6 | TodayReflection | [today-reflection.tsx:113](src/components/planner/today-reflection.tsx#L113) | `grid grid-cols-3 gap-2` 고정 3열 → mobile에서 각 Metric 셀이 100px 미만이면 sub 줄바꿈/overflow | 🟡 | 12m | ★★ |
| 7 | SideTimeline24 | [side-timeline-24.tsx:8,180](src/components/planner/side-timeline-24.tsx#L8) | mobile에서 `CELL_HEIGHT=12` × 48셀 = 576px 또는 `max-h-[480px]` → 화면 80% 점유, 하단 reflection 가려짐 | 🟡 | 15m | ★★ |
| 8 | Builder StepIndicator | [step-indicator.tsx:25](src/components/builder/step-indicator.tsx#L25) | `grid grid-cols-4 sm:grid-cols-8` mobile 4 col인데 step 4·8 라벨 우측 cut-off (캡처 manage-new-mobile.png). 4 col grid가 viewport 375에서 cell padding으로 폭 부족 | 🟡 | 8m | ★★ |

#### 1.2 공통 원인 — 모바일 viewport 고정 너비 layout 부재

- desktop layout(`xl:grid-cols-[420px_1fr]`)에서 작동하는 컴포넌트들이 mobile fold 시 horizontal flex/grid 그대로 유지
- breakpoint mixed: `sm:` (640px) / `md:` (768px) / `lg:` (1024px) / `xl:` (1280px) 일관 부재
- 가장 잦은 패턴: `flex-wrap` 있으나 우측 element가 `ml-auto`로 동일 줄 강제

### 2단계 — fix 후보 3안 (G4 합의 완료 · 2026-05-18 · 채택: B 전체 8건 통합)

| # | 옵션 | 범위 | PR 구조 | 작업 시간 |
|---|---|---|---|---|
| A | Top 3 critical만 (CalendarShell + BottomNav + PageHeader) | 3건 | 1 PR | 33m |
| **B** | **전체 8건 통합 (추천 채택)** | 8건 | 1 PR atomic | 85m |
| C | Top 3 1 PR + 나머지 별 plan 5건 | 3 + 5 | 1 PR + 후속 plan | 33m + 후속 |

**채택: B** — 사용자 명시("전체적으로 UI 측면 audit"). 공통 원인이 mobile viewport layout이라 묶어서 review·검증 효율 ↑.

### 3단계 — 구현 (B 기준 · 8건 atomic PR)

#### 3.1 BottomNav 4탭 확장 ([nav-config.ts](src/components/shell/nav-config.ts), [bottom-nav.tsx](src/components/shell/bottom-nav.tsx))

- [ ] `studentBottomTabs` 4탭으로: 홈(`/planner`) / 관리(`/planner/manage`) / 리포트(`/planner/reports`) / 소개(`/planner/onboarding`)
- [ ] `bottom-nav.tsx` `grid-cols-5` → `grid-cols-4`
- [ ] active 판단 로직을 most-specific match로: 가장 긴 matchPrefix가 active. `/planner/manage`에서 "홈" 탭 active 회귀 방지

#### 3.2 CalendarShell nav wrap ([calendar-shell.tsx:79](src/components/planner/calendar-shell.tsx#L79))

- [ ] 우측 nav `<div>`의 `ml-auto` → `sm:ml-auto`로, mobile에서는 view 토글 아래 줄로 wrap
- [ ] `border-l pl-2` → `sm:border-l sm:pl-2` (mobile에선 wrap된 둘째 줄이라 border 불필요)
- [ ] `w-full sm:w-auto` 추가로 mobile에서 nav full-width

#### 3.3 PageHeader action mobile ([page-header.tsx:38,58](src/components/shell/page-header.tsx#L38))

- [ ] `flex flex-wrap items-end` → `flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between`
- [ ] mobile에서 title이 1줄, action이 다음 줄 (자동 full-width 가능)
- [ ] action wrapper에 `sm:shrink-0` 적용 (mobile 자동 width)

#### 3.4 PlannerCard Metric sub wrap ([planner-card.tsx:203](src/components/planner-manage/planner-card.tsx#L203))

- [ ] `truncate` → `line-clamp-2 break-words` (2줄 허용, 단어 단위 줄바꿈)
- [ ] 또는 `truncate sm:line-clamp-none` (mobile에서만 wrap, desktop 단일 줄)

#### 3.5 NextBlock CTA mobile ([day-view.tsx:106-141](src/components/planner/views/day-view.tsx#L106))

- [ ] 카드 wrapper `flex items-center gap-3` → `flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3`
- [ ] mobile에선 icon + 텍스트 + CTA가 vertical stack, CTA `w-full sm:w-auto`
- [ ] icon 좌측 fixed → mobile에선 텍스트 wrap 위 inline

#### 3.6 TodayReflection 3-col mobile ([today-reflection.tsx:113](src/components/planner/today-reflection.tsx#L113))

- [ ] `grid grid-cols-3 gap-2` → `grid grid-cols-1 gap-2 xs:grid-cols-3` 또는 `grid grid-cols-1 gap-2 sm:grid-cols-3`
- [ ] mobile에서 메트릭 3개 vertical stack (각 셀 full-width) 또는 minimum 메트릭 폭 보장 후 2 col

#### 3.7 SideTimeline24 mobile max-h ([side-timeline-24.tsx:180](src/components/planner/side-timeline-24.tsx#L180))

- [ ] `max-h-[480px]` → `max-h-[320px] sm:max-h-[480px]`
- [ ] mobile에서 timeline 영역이 화면 ~40%만 점유. trim 모드(`trimToBlocks`)이미 적용되어 있어도 추가 단축

#### 3.8 Builder StepIndicator mobile ([step-indicator.tsx:25](src/components/builder/step-indicator.tsx#L25))

- [ ] `grid grid-cols-4 sm:grid-cols-8` → `flex overflow-x-auto sm:grid sm:grid-cols-8`
- [ ] 각 `<li>`에 `min-w-[72px] sm:min-w-0` 추가
- [ ] mobile에서 horizontal scroll snap (8 step 가시화)
- [ ] parent `overflow-hidden` → `overflow-hidden sm:overflow-hidden` (의도 유지, mobile만 scroll 허용)

### 4단계 — 검증 & 머지

- [ ] `bunx tsc --noEmit && bun run lint`
- [ ] Chrome headless 375×812 재캡처 14장 — Before(이전)/After(이번) 비교
- [ ] desktop 1280×800 회귀 없음 확인 (mobile 변경이 desktop 깨뜨림 0)
- [ ] PR (#16 예상) → main 머지
- [ ] production 반영은 G1 명시 슬롯에서 — 오늘 4번째 배포 슬롯이라 PM 결정

## 후속 (별개)
- weekly chart bar_week 중복 제거 (이미 hide 분기 있음, 다른 layout과 일관성 검증)
- 카드 컬러 토큰화 (palettes.ts vs hardcoded class) — Mid 50m
- onboarding 완료 플래그 (MVP 범위 외)
- mobile <360px ultra-narrow 시뮬레이션 (iPhone SE) 별 audit

## 참고
- 어제 patten template: [proc/archive/2026-05-18_reports-day-info-density.md](../archive/2026-05-18_reports-day-info-density.md) (audit #8, 4단계 구조)
- 화면 역분석 슬라이드: [proc/research/2026-05-18_screen-design-rationale.html](../research/2026-05-18_screen-design-rationale.html) (이번 audit 발견 출처)
- 배포 정책: [proc/archive/2026-05-18_deploy-policy.md](../archive/2026-05-18_deploy-policy.md)
