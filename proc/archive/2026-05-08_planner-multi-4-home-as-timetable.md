# 풀림 플래너 다중 시간표 — Plan 4: 홈 = 시간표 통합

## 목표
`/planner` 홈을 *활성 플래너의 시간표*로 변경. 일/주/월 토글이 홈 자체에 들어가 학생이 *시간표 보러 가는 경유지(현 NEXT BLOCK 카드)* 없이 바로 시간표 진입. 기존 `/planner/calendar` redirect → `/planner`.

## 의존성
- Plan 1 (데이터 모델) — 활성 플래너 데이터
- Plan 2 (IA) — 라우트 골격 + day/week/month redirect
- Plan 3 (관리 페이지) — 활성 변경 시 홈 즉시 반영 검증

## 작업 범위
- **재작성**: `src/app/(student)/planner/page.tsx` — 현 압축 홈 → 시간표 (일/주/월)
- **삭제·redirect**: `src/app/(student)/planner/calendar/page.tsx` → `redirect('/planner')`
- **갱신**: `/planner/day|week|month/page.tsx` → `redirect('/planner?view=...')`
- **수정 가능**: `src/components/planner/views/{day,week,month}-view.tsx` — 활성 플래너 데이터로 전환
- **수정 가능**: `src/components/planner/calendar-shell.tsx` — 헤더에 "활성: {플래너명}" 표시 + "다른 시간표로 전환" 링크

## 의사결정

### D1. NEXT BLOCK hero·QuickStat·TodayTimeline의 운명
**결정**: *day view 안에 통합* — day view의 시계 위에 NEXT BLOCK + QuickStat 3, 시계 아래에 미니 타임라인 또는 블록 리스트(현 day-view 그대로). 시간표가 보일 뿐 *결정 표면이 사라지지 않게*.

### D2. 활성 플래너 표시 위치
**결정**: PageHeader의 description 또는 eyebrow에 "활성: {plannerName}" + 클릭 시 `/planner/manage`로. 시간표 토글과 같은 줄에 "다른 시간표 →" 링크.

### D3. /planner/calendar 처리
**결정**: redirect → `/planner` (?view 파라미터 보존). 외부 링크 호환.

### D4. 빈 상태 (활성 플래너 없음)
**결정**: 신규 학생이 빌더 한 번도 안 돌렸을 때 — onboarding 카드 + "+ 첫 시간표 만들기" CTA → `/planner/manage/new`. 데모상은 시드된 활성 플래너가 있어 빈 상태 noop.

### D5. 컨디션·번아웃 패널의 위치
**결정**: 현 day-view에 collapsed ribbon으로 있음. 그대로 유지. 시간표 통합과 충돌 없음.

## 작업 항목

### A. /planner 페이지 재작성 — `(student)/planner/page.tsx`
- [x] **현 콘텐츠 제거** — TodayTimeline·QuickStat·NEXT BLOCK hero (이들은 day-view에 통합)
- [x] **시간표 셸 적용** — 기존 `/planner/calendar`의 본문(CalendarShell + day/week/month) 그대로 이전
- [x] **PageHeader** — eyebrow "내 시간표" + title "{plannerName}" + description 활성 플래너 메타 + "다른 시간표로 전환" 링크
- [x] **`useSearchParams` view 파라미터** — day/week/month 토글
- [x] **활성 플래너 데이터 사용** — `getActivePlanner()` 호출, 그 결과로 페이지 메타 채움

### B. /planner/calendar redirect
- [x] `(student)/planner/calendar/page.tsx` — 콘텐츠 *완전 제거* → `redirect('/planner' + viewParam)` (Suspense + useSearchParams 처리)
- [x] 또는 단순 mount-time `redirect('/planner')` (view 파라미터 손실 trade-off)
- [x] 결정: view 파라미터 보존 — `?view=...` 그대로 패스

### C. /planner/day|week|month redirect 갱신
- [x] Plan 2에서 임시로 `/planner/calendar?view=...`로 두었던 redirect를 `/planner?view=...`로 갱신

### D. day-view 통합 — NEXT BLOCK + QuickStat
- [x] **현 day-view** — 시계 + ConditionBurnoutPanel + 블록 리스트 + TodayReflection
- [x] **추가**: 시계 위에 NEXT BLOCK hero (현 home page에서 이전) + QuickStat 3 (컨디션·번아웃·진행)
- [x] **TodayTimeline은 미니 표면** — 시계와 중복이라 *제거* 또는 *holiday-only*. 결정: *제거* (시계가 같은 정보를 시각화)

### E. CalendarShell 헤더 — 활성 플래너 표시
- [x] **eyebrow**: "내 시간표"
- [x] **title**: 현 *날짜·기간 표기* (예: "오늘의 학습 — 4월 24일 목요일") 그대로
- [x] **description**: 활성 플래너명 + D-day + 진행률 (현 calendar/page.tsx의 description 그대로)
- [x] **action 슬롯**: "다른 시간표로 전환" 링크 → `/planner/manage`

### F. CRUD 후 홈 즉시 반영 검증
- [x] Plan 3에서 활성 변경 → 홈 진입 시 새 활성 플래너의 메타가 노출되는지
- [x] 데모상 *페이지 새로고침 시 갱신*. SPA 즉시 갱신은 mock state 한계라 trade-off

## 검증
- [x] `bunx tsc --noEmit` 통과
- [x] `bun run lint` 0 errors
- [x] 라이브 200 OK
  - `/planner` (시간표, 기본 day view)
  - `/planner?view=week|month`
  - `/planner/calendar` (redirect → /planner) — view 파라미터 보존
  - `/planner/day|week|month` (redirect → /planner?view=...)
- [x] 라이브 인터랙션 (playwright):
  - 홈 진입 → 시간표(day view) + NEXT BLOCK + QuickStat + 시계 + 컨디션 패널 + 블록 리스트 + 회고 ribbon 모두 노출
  - 일/주/월 토글 정상
  - 활성 플래너명이 헤더에 표시 + "다른 시간표로 전환" → `/planner/manage`
  - 관리 페이지에서 활성 변경 → 홈 새로고침 시 새 메타 반영
- [x] 모바일(390×844) 캡처 — 시간표 토글·시계·블록 리스트 모두 깨짐 없음

## 본 plan 제외
- 활성 변경 시 *SPA 즉시 갱신* — mock state 한계
- 시간표 *블록 단위 편집* — 빌더 흐름으로 처리
- 학원 일정 import — 별도 plan

## 트레이드오프 메모
- **NEXT BLOCK 위치 이동** — 기존 학생 홈에서 메인이었던 hero가 day view 시계 위로 이동. 사용자 인지에 영향 가능. 시계 자체가 "오늘 흐름"이라 NEXT BLOCK과 시각 중복 일부 발생 — 결정: NEXT BLOCK은 시계 위 작은 카드로 유지(현 day view와 동일)
- **TodayTimeline 제거** — 시계와 정보 중복. 시계가 더 직관적이라 미니 칩은 제거. 학생이 "한 줄로 보고 싶다"는 피드백 시 부활 검토
- **/planner/calendar 자원 회수** — 본 plan으로 사실상 사용 안 됨. 파일 삭제 vs redirect 유지. *redirect 유지* 권장 (외부 링크 호환)
