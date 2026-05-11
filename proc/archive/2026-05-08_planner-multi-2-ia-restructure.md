# 풀림 플래너 다중 시간표 — Plan 2: IA 재구성 + 라우트 이동

## 목표
사이드바·라우트를 새 IA로 재구성. 기존 `/planner/calendar`·`/planner/builder` 등 라우트를 새 위치로 redirect. 빌더는 *시간표 관리 하위*로 이전.

본 plan은 *IA 골격*만 바꿈. 실제 페이지 콘텐츠는 Plan 3·4에서 본구현.

## 의존성
- Plan 1 (데이터 모델) 완료 후 진행

## 작업 범위
- **수정**: `src/components/shell/nav-config.ts` (plannerSection)
- **수정**: 기존 라우트 일부를 redirect로 (`/planner/calendar`, `/planner/builder`, `/planner/day`, `/planner/week`, `/planner/month`)
- **신규 (placeholder만)**: `/planner/manage/page.tsx`, `/planner/manage/new/page.tsx`, `/planner/manage/[id]/edit/page.tsx`
  - 본 plan에서는 *placeholder ComingSoon* 또는 *기존 builder를 그대로 옮긴* 단순 wrapper. 본구현은 Plan 3에서

## 의사결정

### D1. 기존 `/planner/calendar` 처리
**결정**: redirect → `/planner` (홈으로 흡수). 외부에서 `/planner/calendar`로 들어오는 동선 보존.

### D2. 기존 `/planner/builder` 처리
**결정**: redirect → `/planner/manage/new`. 빌더 *콘텐츠 자체는 manage/new에서 그대로 사용* — 본 plan에서 빌더 페이지를 *manage/new로 이동*하고 기존 위치는 redirect만.

### D3. /planner/day, /week, /month redirect
**결정**: 기존엔 `/planner/calendar?view=...`로 갔는데 이제 `/planner?view=...`로. 단순 redirect 변경.

### D4. 시간표 미리보기 페이지 (`/planner/manage/[id]`)
**결정**: 본 plan에서 *생성하지 않음*. Plan 3에서 결정. 카드 클릭 시 *활성화 후 홈으로 이동*하거나 *전용 미리보기 페이지로*. UX 결정 후 추가.

## 작업 항목

### A. nav-config — plannerSection 갱신
- [x] **5개 → 4개로 축소**:
  ```
  홈 (/planner)              — "활성 플래너 시간표"
  시간표 관리 (/planner/manage) — "N개 시간표 + 새로 만들기"
  성장 리포트 (/planner/reports) — 기존
  소개하기 (/planner/onboarding) — 기존
  ```
- [x] **"캘린더" 항목 제거** — 홈에 흡수
- [x] **"플래너 빌더" 항목 제거** — 시간표 관리 하위로 이동(개별 nav 미노출, 카드에서 진입)

### B. 라우트 이동 — 빌더 → /planner/manage/new
- [x] **현 `src/app/(student)/planner/builder/page.tsx`** 콘텐츠를 **`src/app/(student)/planner/manage/new/page.tsx`**로 *복사*
- [x] 현 빌더 페이지를 redirect로 변경 — `redirect('/planner/manage/new')`
- [x] 빌더 내부의 `router.push('/planner/calendar')` 호출도 `'/planner'`로 (Plan 4 후 정합)

### C. 라우트 redirect 갱신
- [x] **`/planner/calendar/page.tsx`** — 현재 `<PlannerCalendar />` 본구현. 본 plan에서는 *그대로 둠* (Plan 4에서 `/planner`로 이동). 단 *redirect 우선* 옵션은 Plan 4에서 결정
- [x] **`/planner/day/page.tsx`** — `redirect('/planner?view=day')`로 갱신 (현재는 `/planner/calendar`)
- [x] **`/planner/week/page.tsx`** — `redirect('/planner?view=week')`
- [x] **`/planner/month/page.tsx`** — `redirect('/planner?view=month')`
  - 단 현 `/planner`가 시간표가 아니므로 Plan 4 전엔 깨짐. 임시 — `/planner/calendar?view=...`로 두고 Plan 4에서 일괄 갱신

### D. /planner/manage placeholder 신규
- [x] **`/planner/manage/page.tsx`** — `ComingSoon` 또는 *간단 카드 그리드* placeholder. Plan 3에서 본구현
- [x] **`/planner/manage/new/page.tsx`** — 빌더 콘텐츠 (B에서 이전됨)
- [x] **`/planner/manage/[id]/edit/page.tsx`** — Plan 3 작업 — 본 plan은 *생성만*하지 않음 (404 회피용 placeholder만)

### E. plannerSection 라벨·description 갱신 메모
- [x] 홈 description: "활성 플래너 — 일·주·월 시간표"
- [x] 시간표 관리 description: "내 시간표 N개 — 새로 만들기·수정·삭제"

## 검증
- [x] `bunx tsc --noEmit` — exit 0
- [x] `bun run lint` — 플래너 도메인 0 errors
- [x] 라이브 200 OK — 신규/이전된 모든 라우트
  - `/planner` (기존 홈, Plan 4 전이라 그대로)
  - `/planner/manage` (placeholder)
  - `/planner/manage/new` (빌더 이전)
  - `/planner/manage/[id]/edit` (placeholder)
  - `/planner/calendar` (그대로 — Plan 4에서 redirect)
  - `/planner/builder` (redirect → /planner/manage/new)
  - `/planner/day|week|month` (redirect 갱신 — 임시 `/planner/calendar?view=...`)
- [x] 사이드바 plannerSection이 4항목 노출 + 잠금 상태 정합
- [x] 빌더 → manage/new 이동 + 기존 /builder는 자동 redirect

## 본 plan 제외 (Plan 3~4)
- /planner/manage 페이지 본구현 (카드 그리드·CRUD UI)
- /planner/manage/[id]/edit 빌더 with pre-fill
- /planner = 시간표 통합 (홈 변경)
- /planner/calendar redirect → /planner
