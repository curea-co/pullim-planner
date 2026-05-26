# 2026-05-26 — Container/Presenter 컨벤션 도입 (FE 구조 재편)

## 목표

`apps/planner` FE를 [curea-co/pullim](https://github.com/curea-co/pullim)이 사실상 강제하고 있는 **Container/Presenter + `features/<domain>/`** 컨벤션으로 재편한다. pullim 본 리포가 33개 Container · 40개 Presenter로 검증한 패턴을 그대로 차용.

**완료 기준** (이 plan 전체):
- 로직 보유 페이지(`page.tsx` 80줄+ 6개) 전부 `Container + Presenter` 로 분리되어 `page.tsx`는 Suspense + Container 마운트만 담당
- `src/components/{planner,planner-manage,planner-builder,builder}/` → `src/components/features/<domain>/{containers,presenters,components}/` 로 재편
- AGENTS.md / CLAUDE.md 가 새 컨벤션을 반영 (`pm-rule` 류 문서 있다면 거기까지)
- pullim에서 차용한 패턴 한 페이지 이상이 **실제로 동작**하고 Codex review 통과

---

## 1. 배경 — 왜 지금 하나

| 시그널 | 현 상태 | 위험 |
|---|---|---|
| `manage/[id]/edit/page.tsx` 239줄 | `useState` 5개 + `useRouter` + `useSearchParams` + form 로직이 한 파일 | 디자인 변경 시 데이터 코드 동시 수정 → 사고 |
| `manage/page.tsx` 228줄 | 모달 state 3개 + planner CRUD + 강제 re-render 트릭 | 테스트 불가, 의도 파악 어려움 |
| pullim 본 리포 | Container 33 / Presenter 40 — 모든 feature가 동일 패턴 | (참고할 기준이 이미 존재) |
| pullim BE 차용 PR #27 머지됨 | BE 구조는 이미 pullim 정렬 완료 | FE만 정렬 남음 — 통합 노이즈 줄일 타이밍 |

## 2. 영향 범위 — 측정 결과

### 2.1 분리 대상 페이지 (로직 보유, 80줄+)

| 페이지 | 라인 | 핵심 상태/로직 | 우선순위 |
|---|---|---|---|
| `manage/[id]/edit/page.tsx` | 239 | tab/step/form state, router/params | P1 |
| `manage/page.tsx` | 228 | 모달 3개, CRUD, useMemo 필터 | P1 |
| `manage/new/page.tsx` | 177 | step form | P1 |
| `planner/page.tsx` | 153 | useSearchParams, useEffect, redirect 가드 | P2 |
| `onboarding/page.tsx` | 123 | (확인 필요) | P2 |
| `reports/page.tsx` | 88 | (확인 필요) — **파일럿 후보** | P0 |

### 2.2 분리 미대상 (이미 thin)

`calendar`, `builder`, `week`, `month`, `day`, `(student)/page.tsx` — 모두 6~11줄, 이미 redirect/래퍼 수준. **건드리지 않음**.

### 2.3 컴포넌트 폴더 재편

**현재 → 타깃**
```
src/components/
  planner/           38개  (home, layouts, views, reports 하위그룹)   ──┐
  planner-manage/     5개                                                │  features/<domain>/
  planner-builder/    2개                                                │  로 재편
  builder/            1개  (planner-builder로 통합)                      │
                                                                         ▼
src/components/features/
  planner-home/        containers/ presenters/ components/  (planner/home + views/day-view 등)
  planner-manage/      containers/ presenters/ components/  (기존 planner-manage/ + manage 페이지 분리물)
  planner-builder/     containers/ presenters/ components/  (planner-builder/ + builder/ 통합)
  planner-onboarding/  containers/ presenters/              (onboarding 페이지 분리물)
  planner-reports/     containers/ presenters/ components/  (planner/reports + reports 페이지 분리물)

src/components/shell/  ── 그대로 (글로벌 셸, 13개)
src/components/ui/     ── 그대로 (shadcn 프리미티브, 17개)
src/components/brand/  ── 그대로
```

`planner/` 38개 안에서 어디 가야 할지 모호한 것들 (예: `block-card`, `today-timeline`)은 **planner-home에 일단 두고 추후 재배치** — 이번 plan 범위 밖.

## 3. 컨벤션 — pullim이 강제하는 규칙

> 출처: [curea-co/pullim `apps/web/components/features/faq/`](https://github.com/curea-co/pullim/tree/main/apps/web/components/features/faq) 등 33개 feature 관찰

### 3.1 layer 책임

| layer | 파일 위치 | 책임 | 금지 |
|---|---|---|---|
| **page** | `src/app/.../page.tsx` | `<Suspense><XxxContainer /></Suspense>` 마운트만 | useState, fetch, business logic |
| **Container** | `features/<domain>/containers/XxxContainer.tsx` | 데이터 fetch (api-client/mock), state 관리, router/searchParams 처리, 이벤트 핸들러, Presenter에 props 전달 | JSX 마크업 (Provider 래핑은 예외) |
| **Presenter** | `features/<domain>/presenters/XxxPresenter.tsx` | props로 받은 데이터로 화면 그리기, 디자인 시스템 컴포넌트 조합 | useState (UI 전용 작은 토글은 예외), fetch, router 직접 호출 |
| **components** | `features/<domain>/components/*.tsx` | feature 내부에서만 쓰는 작은 부품 | feature 외부 import는 **소유 feature가 명확한 widget에 한해 허용** (§3.1.1 정책) |
| **contexts** | `features/<domain>/contexts/XxxContext.tsx` | feature 전체에서 공유되는 상태/provider | (선택) |
| **hooks** | `features/<domain>/hooks/use-xxx.ts` | 재사용 가능한 로직 추출 | (선택) |

#### 3.1.1 cross-feature import 정책

feature A의 컴포넌트를 feature B에서 import해도 된다. 단:
- widget 소유권이 한쪽 feature에 명확해야 함 (예: `today-reflection`은 `planner-home` 소유, `planner-reports`는 사용자) — git history나 의미적 owner로 판단
- 임포트 방향이 일관 (양방향 의존 금지 — feature 그래프가 사이클 없도록)
- 빌려오는 쪽은 widget을 **있는 그대로 보여주기만** (감싸서 동작 바꾸지 않기). 동작 변경 필요 시 widget을 Container/Presenter로 쪼개 props로 행동 분리 후 빌려옴
- 진짜 순수 프리젠테이션(state·router·side effect 없음)은 `src/components/shared/`로 승격 — 현재 비어있음, widget 추가는 신중하게

### 3.2 명명 규칙

- Container/Presenter 파일명 = `<도메인의 명사>Container.tsx` / `<도메인의 명사>Presenter.tsx`
- 페이지가 여러 개면 페이지별로: `ManagePlannersContainer`, `EditPlannerContainer`, `NewPlannerContainer`
- export default 사용 (pullim 컨벤션)

### 3.3 Suspense

- `page.tsx`는 항상 `<Suspense>` 로 Container 감싸기 (pullim 본 리포 `FAQPage` 패턴)

## 4. Phase 분할 (= PR 분할)

각 phase = 1 PR. **Codex review 통과 필수** — 2026-05-20 결정사항: COMMENT 상태로 그대로 머지 금지, 지적사항 반영 후 재리뷰 또는 사용자 명시 무시 승인 후 진행 ([CLAUDE.md](../../CLAUDE.md) §5 Orchestration 체크리스트 항목 5).

### Phase 1 — 컨벤션 문서화 + `reports` 파일럿 (PR #1)

가장 작은 88줄 페이지로 패턴 검증. 사고 나도 되돌리기 쉬움. 컨벤션 문서는 **실제 동작하는 코드와 함께** 머지 (문서만 머지는 검증 가치 낮음).

**문서**
- [x] `AGENTS.md` 에 §3 컨벤션 표 추가 (Container/Presenter 책임 분리) — PR #32
- [x] `CLAUDE.md` §2 편집 영역 표 — `features/` 경로 + `shared/` 컨벤션 추가 — PR #32

**파일럿 코드**
- [x] `reports/page.tsx` 분석 → 로직/UI 라인 식별 (88줄 → 11줄)
- [x] `features/planner-reports/containers/ReportsContainer.tsx` 생성 (Container 순수성: 마크업 0줄 — `<ReportsPresenter ... />` mount만 허용, 원시값만 props로 전달)
- [x] `features/planner-reports/presenters/ReportsPresenter.tsx` 생성 (description 조합 보유)
- [x] `src/components/planner/reports/*` → `features/planner-reports/components/*` 이동 (7 파일, git mv)
- [x] `reports/page.tsx` → Server Component + `<Suspense><ReportsContainer /></Suspense>` (`'use client'` 제거)
- [x] Codex 권고 반영: `weekly-chart` + `month-heatmap` + `today-reflection` → **`features/planner-home/components/`** 선이동 (3 widget이 useRouter/toast/mock 도메인 결합 보유 → shared 부적합. Phase 3에서 planner-home 페이지/Container/Presenter 본격 도입)
- [x] reports ↔ planner-home **cross-feature import** 허용 정책 명시 (widget 소유권은 planner-home, reports는 빌려옴)

**검증**
- [x] `bun run typecheck && bun run lint` 통과 (5 워크스페이스, 0 error)
- [x] `bun dev`로 `/planner/reports` 라우트 동작 확인 (3 view + invalid fallback + 회귀 라우트)
- [x] PR 본문에 before/after 라인 수 + 차용한 pullim 파일 링크 첨부 — PR #32

### Phase 2 — `manage` 도메인 3개 페이지 (PR #2)

가장 logic-heavy. P1 우선순위.

**진입 전 prerequisite** (Phase 2 시작 전 별도 작업)
- [ ] `manage/page.tsx` 의 `setTick` 강제 re-render 트릭 — **investigate 스킬로 root cause 분석**
  - 단순 mock 캐시 무효화 목적이면 Container 이동 시 그대로 보존 OK
  - 진짜 state 동기화 문제면 별도 plan으로 분리 (이번 plan blocker로 명시)

**리팩터링**
- [ ] `manage/page.tsx` → `ManagePlannersContainer` + `ManagePlannersPresenter`
- [ ] `manage/new/page.tsx` → `NewPlannerContainer` + `NewPlannerPresenter`
- [ ] `manage/[id]/edit/page.tsx` → `EditPlannerContainer` + `EditPlannerPresenter`
- [ ] 모달 3개 (activate/delete/archive) → `features/planner-manage/components/` 로 이동 (이미 있는지 확인)
- [ ] form 로직 → `features/planner-manage/hooks/use-planner-form.ts` 로 추출 (`new` + `edit` 공유)
- [ ] 기존 `src/components/planner-manage/*` → `features/planner-manage/components/*` 이동
- [ ] 라우트 3개 모두 golden path 동작 확인

### Phase 3 — `planner` home + `onboarding` (PR #3)

- [ ] `planner/page.tsx` → `HomeContainer` + `HomePresenter` (redirect 가드 포함)
- [ ] `onboarding/page.tsx` → `OnboardingContainer` + `OnboardingPresenter`
- [ ] `src/components/planner/{home,layouts,views}/*` → `features/planner-home/components/*` 이동 (Phase 1에서 선이동된 3 widget 제외, planner-reports로 옮긴 것 제외)
- [ ] `/planner`, `/planner/onboarding` 동작 확인
- [ ] **widget 정제 검토** — Phase 1에서 선이동된 `today-reflection`(285줄), `month-heatmap`이 자체 useRouter/toast/mock selector 보유. Container/Presenter로 쪼개서 reports presenter가 더 작은 props 인터페이스만 보게 할지 결정 (현재는 reports → planner-home 직접 import)

### Phase 4 — 잔여 폴더 통합 + import 경로 일괄 정리 (PR #4)

- [ ] `src/components/builder/*` → `features/planner-builder/components/*`
- [ ] `src/components/planner-builder/*` → `features/planner-builder/components/*`
- [ ] 잔여 `src/components/planner/*` (home/views/layouts/reports 외) → `features/planner-home/components/` 또는 적절한 feature
- [ ] 모든 import 경로 일괄 갱신 (`bunx tsc --noEmit` 로 검증)
- [ ] 빈 디렉터리 (`src/components/planner/` 등) 제거
- [ ] `bun run build` 통과

### Phase 5 — 문서 마감 (PR #5)

- [ ] `CLAUDE.md` §1 편집 영역 표 최종본 (`features/<domain>/` 경로로 교체)
- [ ] `AGENTS.md` 에 "이 프로젝트는 Container/Presenter 컨벤션을 따른다" 명문화
- [ ] `README.md` 에 폴더 구조 다이어그램 갱신
- [ ] plan 문서는 **사용자 명시 시에만 archive** — PR 머지 후 자동 archive 금지. 사용자가 "archive로 옮겨"라고 명시할 때만 `proc/archive/`로 이동

---

## 5. 비-목표 (이번 plan 범위 아님)

- pullim 외부 디자인 시스템 (`@pullim/design-system`) 도입 — **별도 plan**
- `@pullim/ui` 패키지 도입 — 컴포넌트 3개뿐이라 ROI 낮음, 보류
- Motion (`PullimFadeIn` 등) 차용
- 페이지 자체의 UX/디자인 변경 — 이번 plan은 **구조만**, 픽셀 0 변경
- `src/components/shell/*`, `src/components/ui/*`, `src/components/brand/*` 의 위치/구조 변경

## 6. 리스크 & 미정 사항

| 리스크 | 영향 | 완화 |
|---|---|---|
| `manage/page.tsx` 의 `setTick` 강제 re-render — Container로 옮길 때 동일 동작 보장 어려움 | Phase 2 blocker 가능 | Phase 2 진입 전에 `setTick` 의도부터 root cause 분석. 필요시 react-query/swr 도입 검토 (별도 PR) |
| `planner/page.tsx` 의 redirect 가드 — Suspense boundary와 충돌 가능성 | Phase 3 | pullim의 redirect 패턴 (FAQContainer 참고) 차용 |
| 38개 컴포넌트의 feature 배치 모호함 (어디로 갈지 불명확한 것들) | Phase 4 | 일단 `planner-home/components/` 에 모두 두고 추후 plan에서 재배치. 이번엔 무리하지 않음 |
| BE 차용 PR(#27)과 충돌 — Phase 2에서 manage 페이지가 mock이 아니라 api-client로 바뀌어 있을 가능성 | 코드 충돌 | Phase 2 시작 시점에 manage 페이지의 데이터 출처(mock vs api-client) 재확인 |
| Codex review가 "굳이 features/ 폴더 도입 안 해도 됨" 류 코멘트 줄 가능성 | Phase 0/1 | PR 본문에 pullim 본 리포 참조 (Container 33 / Presenter 40) 근거 첨부 |

### 결정 사항 (2026-05-26 사용자 확인)

| 항목 | 결정 |
|---|---|
| 폴더 이름 | `features/planner-*` 접두 유지 (현 `components/planner-*` 와 일관성) |
| Phase 0 PR 분리 | **합침** — 컨벤션 문서는 Phase 1 파일럿 코드와 함께 머지 |
| `setTick` 처리 | Phase 2 진입 전 `investigate` 스킬로 root cause 분석. 단순 cache 무효화면 그대로 보존, 진짜 동기화 문제면 별도 plan으로 분리 |

### 미정 — 추후 결정

- [ ] react-query 등 server state 라이브러리 도입 여부 — `setTick` 분석 결과에 따라

---

## 작업 항목 (요약 체크리스트)

- [ ] Phase 1 (PR #1) — 컨벤션 문서화 + `reports` 파일럿
- [ ] Phase 2 (PR #2) — `manage` 3개 페이지 (prerequisite: `setTick` root cause 분석)
- [ ] Phase 3 (PR #3) — `planner` home + `onboarding`
- [ ] Phase 4 (PR #4) — 잔여 폴더 통합 + import 경로 정리
- [ ] Phase 5 (PR #5) — 문서 마감
