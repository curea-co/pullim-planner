# 풀림 플래너 홈 — 일/주/월 레이아웃 정합

## 목표
홈(`/planner`)의 일/주/월 view를 *동일 IA*로 통일 — **좌측: 시간표 / 우측: 상세 정보**. 컬럼 폭·높이가 view 간 점프 없이 일관되게.

## 사용자 피드백 (2026-05-08)
- 일간·주간 view가 *차지하는 영역이 갑자기 달라지는 게 어색*
- 좌측 시간표·우측 상세정보 구조로 간다면 *높이라도 맞춰야* 함
- 우측 콘텐츠 매핑:
  - 일간 → 학습 블록
  - 주간 → 주간 달성 목표
  - 월간 → 해당 월 달성률

## 현재 상태 (분석)

| View | 현재 레이아웃 | 좌측 | 우측 |
|---|---|---|---|
| day | grid 420px / 1fr | 시계 + ConditionBurnoutPanel | 블록 리스트 + TodayReflection |
| week | 단일 컬럼 stack | — | WeekGrid + WeeklyChart 세로 |
| month | 단일 컬럼 stack | — | KPI 3 + MonthHeatmap + 시험 카드 |

→ day만 2-column, week/month는 single-column. *전환 시 시각 점프 큼*.

## 의사결정

### D1. 공통 grid 채택
**결정**: 셋 모두 `grid xl:grid-cols-[420px_1fr] gap-4` (mobile 1열 stack). 좌측 폭은 day-view 시계 카드의 자연 폭(~420px)에 맞춤.

### D2. 우측 콘텐츠 매핑
- day → **블록 리스트 + TodayReflection** (기존 유지)
- week → **`WeeklyGoalsCard` 신규** (주간 달성 목표·정답률·약점 정복) + 기존 `WeeklyChart`
- month → **`MonthlyProgressCard` 신규** (KPI 3 + 다가오는 마일스톤 통합) — 기존 분리되어 있던 카드들 통합

### D3. 좌측 콘텐츠 — 시간표 자체
- day: 시계 카드(시계 + 다음 블록 작은 카드 + 색상 범례 토글) + ConditionBurnoutPanel
- week: `WeekGrid` (그대로)
- month: `MonthHeatmap` (그대로)

### D4. 높이 정합 전략
**결정**: CSS grid의 자연 stretch에 맡김 + 우측 콘텐츠 적당히 채움. *완벽 동일 높이* 강제하지 않음(반응형 다양). 단 *좌측 컴포넌트 minHeight* 가이드:
- 시계 카드 + ConditionBurnoutPanel ≈ 700~800px
- WeekGrid ≈ 500~600px (현재) → 우측 콘텐츠도 비슷
- MonthHeatmap ≈ 600px → 우측 콘텐츠도 비슷

### D5. 기존 WeeklyChart 위치
**결정**: 좌측 컬럼 *시간표 아래*로 이동 (week view). WeekGrid 50% + WeeklyChart 50%로 좌측 채움. 우측은 WeeklyGoalsCard.

### D6. 기존 month-view 시험 카드 + KPI 처리
**결정**: 우측 컬럼의 `MonthlyProgressCard`에 *통합*. KPI 3종(완료한 날·streak·이번 달 평균) + 다가오는 마일스톤 + 약점 단원 진도(reports에서 가져옴) 한 카드.

### D7. day-view 우측 컬럼 높이
**결정**: 현 day-view는 우측에 블록 리스트 8개 + TodayReflection 회고. 자연 높이가 좌측(시계 + 컨디션 패널)과 비슷. 그대로 유지.

## 작업 범위
- **수정**: `src/components/planner/views/{day,week,month}-view.tsx`
- **신규**: `src/components/planner/home/{weekly-goals-card,monthly-progress-card}.tsx`
- **그대로**: `WeekGrid`, `WeeklyChart`, `MonthHeatmap` (위치만 이동)
- **/planner/page.tsx 영향 없음** — view 컴포넌트 내부 레이아웃 변경

## 작업 항목

### A. WeeklyGoalsCard 신규 — `components/planner/home/weekly-goals-card.tsx`
- [x] **메트릭 4종** (Reports의 weekly-summary 응용):
  - 학습 시간 vs 목표 (29.3h / 30h)
  - 평균 정답률 + 추세 (88% ↑12%)
  - 약점 정복 진도 (1건 정복 / 12건 잔여)
  - 감정 평균 (🙂 4.0 / 5)
- [x] **인사이트 2건** — 룰 기반 ("수학 정답률 +12%" / "월·화 시간 부족")
- [x] **CTA**: "주간 리포트 자세히" → `/planner/reports?view=week`

### B. MonthlyProgressCard 신규 — `components/planner/home/monthly-progress-card.tsx`
- [x] **KPI 3종** — 100% 완료한 날 / 연속 학습 / 시험까지 진척률 (% 기반)
- [x] **이번 달 학습 시간** — 합계 + 일평균
- [x] **다가오는 마일스톤** — `getNextMilestone()` 결과 카드
- [x] **약점 단원 진도 (Top 3)** — getWeakNodes 활용
- [x] **CTA**: "월간 리포트 자세히" → `/planner/reports?view=month`

### C. day-view 레이아웃 통일 — *변경 없음*
- [x] 현재 `grid xl:grid-cols-[420px_1fr]` 그대로
- [x] 본 plan에서 day-view 손대지 않음

### D. week-view 레이아웃 변경
- [x] **현재**: 단일 컬럼 stack (WeekGrid + WeeklyChart)
- [x] **변경 후**: `grid xl:grid-cols-[420px_1fr] gap-4`
  - **좌측**: WeekGrid + WeeklyChart 세로
  - **우측**: WeeklyGoalsCard
- [x] 모바일은 1열 stack (xl 미만)

### E. month-view 레이아웃 변경
- [x] **현재**: 단일 컬럼 stack (KPI 3 + MonthHeatmap + 학습 시간 카드 + 시험 카드)
- [x] **변경 후**: `grid xl:grid-cols-[420px_1fr] gap-4`
  - **좌측**: MonthHeatmap (heatmap 자체가 ~420px 자연 폭)
  - **우측**: MonthlyProgressCard (KPI 3 + 학습 시간 + 마일스톤 + 약점 진도 통합)
- [x] 기존 분리된 KPI/학습시간/시험 카드 *제거* (MonthlyProgressCard로 통합)

### F. 모바일 반응형
- [x] xl 미만에서 1열 stack — `xl:grid-cols-[420px_1fr]` 패턴 자연 처리
- [x] 모바일 day/week/month 각각 콘텐츠 순서 — 좌측이 먼저, 우측이 다음

## 검증
- [x] `bunx tsc --noEmit` 통과
- [x] `bun run lint` 0 errors
- [x] 라이브 200 OK — `/planner`, `?view=week|month`
- [x] 라이브 인터랙션 (playwright):
  - 일/주/월 토글 시 *동일 grid 구조*로 시각 점프 없음
  - 좌측 폭 일관 (xl 1280px 이상에서 420px)
  - week view 우측에 WeeklyGoalsCard 노출
  - month view 우측에 MonthlyProgressCard 노출 (KPI + 마일스톤 + 약점)
- [x] 모바일(390×844) — 3 view 모두 1열 stack 정상
- [x] 데스크톱(1280) 시각 캡처 — 일/주/월 토글 시 영역 변화가 자연스러운지

## 본 plan 제외
- TodayReflection·ConditionBurnoutPanel 위치 조정 — 별도 polish
- 좌측·우측 *완벽 동일 높이* 강제 — 자연 stretch 수용
- WeekGrid·MonthHeatmap *내부 시각 변경* — 위치만 이동, 컴포넌트 손대지 않음

## 트레이드오프 메모
- **week/month view에 좌측 시간표 폭 420px 강제** — heatmap·grid가 자연 폭 충분. 더 넓힐 수도 있으나 day-view와 통일성 우선
- **우측 콘텐츠 분량 균형** — Reports 페이지와 일부 정보 중복(주간/월간). 홈은 *요약*, Reports는 *상세*로 역할 분리
- **WeeklyChart 위치** — 좌측 시간표 아래에 배치. WeekGrid가 작아 보일 수 있으나 정보 밀도 우선
