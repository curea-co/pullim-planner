# 풀림 플래너 홈 — 일간 블록 / 주간 그리드 간소화

## 목표
- **일간 우측** 학습 블록 리스트를 *컴팩트 행*으로 압축 → 좌측(시계+컨디션 패널)과 높이 정합
- **주간 좌측** WeekGrid 셀의 분·카운트 텍스트 제거 → 시각(막대)만 + hover 시 native title로 상세. 영역 밖 잘림 해소

## 사용자 피드백 (2026-05-08)
- "오늘의 학습 블록 간소화 — 좌측 시간표 영역과 높이 맞추기 위함"
- "주간 시간표는 영역 밖으로 잘리는 현상 — 내부 정보가 반드시 필요한 정보가 아님. 시각만 표현, 마우스 호버 시 알려주는 방식"

## 현재 상태 분석

### 일간 우측 — 학습 블록 리스트
현재 `BlockCard` 8개. 각 카드:
- 헤더(시간·과목·상태·케밥) + 본문(아이콘+제목+감정/정확도) + progress + reasoning + 엔진 태그 + CTA
- 카드당 약 100~140px → 8 × 120 = ~960px
- 좌측은 시계 카드(~580px) + ConditionBurnoutPanel(ribbon collapsed ~62px) + 다음 블록 카드 = 약 700px
- **차이 ~260px** → 우측이 길게 늘어남

### 주간 좌측 — WeekGrid
- 7 타입 row × 7 요일 col + 라벨 열 = 8열
- 각 셀 `min-w-[58px]` + 분·카운트 텍스트 → 좌측 420px 폭 안에 안 들어감, `overflow-x-auto`로 가로 스크롤
- desktop 캡처에서 일요일(7번째 요일) 잘림

## 의사결정

### D1. BlockCard 변형 — variant prop vs 별도 컴포넌트
**결정**: `BlockCard`에 `variant?: 'card' | 'compact'` prop 추가. day-view 우측 리스트에서 `compact` 사용. 기존 `card` 동작은 default 유지(다른 사용처 호환).

### D2. compact 행의 노출 정보
**결정**: 한 줄에 `시간 · 타입 아이콘 · 제목(truncate) · 상태 칩 · CTA`. 제거: 엔진 태그, 케밥, reasoning chip(별도 옆에 작게 inline 또는 tooltip). progress bar는 active일 때만 행 아래 가는 줄.

### D3. 케밥 메뉴 위치
**결정**: compact 행에서는 *케밥 hover로만 노출* (기본 hide) 또는 행 우측 끝에 작게. 우선순위 — 행 클릭이 더 중요. 케밥은 hover 시에만 노출(우측 끝).

### D4. WeekGrid 셀 시각 표현
**결정**: 셀에서 분 숫자 + 카운트 텍스트 *제거*. 막대만 노출하되 *막대 자체에 강도 색상* 입혀 시각 인지. 빈 셀은 옅은 회색. native `title` 그대로 활용("2블록 · 100분").

### D5. WeekGrid 폭 정합
**결정**: `min-w-[58px]` → `min-w-[40px]`로 축소. `overflow-x-auto` 유지(모바일 안전망)지만 desktop 좌측 420px에 들어가도록. 라벨 열은 그대로(블록 타입명 보존).

### D6. compact 행 디자인 톤
**결정**: 현 BlockCard의 active/done/skipped/todo 분기 그대로 유지. 단 padding·gap 축소. 행 height ~52~64px 목표.

## 작업 범위
- **수정**: `src/components/planner/block-card.tsx` (variant prop)
- **수정**: `src/components/planner/views/day-view.tsx` (BlockCard variant="compact" 전달)
- **수정**: `src/components/planner/week-grid.tsx` (셀 텍스트 제거, min-w 축소)

## 작업 항목

### A. BlockCard에 compact variant
- [x] **prop 추가** — `variant?: 'card' | 'compact'` (default `'card'`)
- [x] **compact 분기**:
  - 단일 행 layout — `시간 [아이콘] 제목 [상태칩] [CTA]`
  - 시간: `font-mono text-[11px]` (예: "18:25")
  - 타입 아이콘: `h-3.5 w-3.5`
  - 제목: `truncate text-sm font-semibold`
  - 상태 칩: 현 statusMeta 그대로, 작게
  - CTA: "시작" / "이어서" / 완료 시 아이콘만 (정확도 작게)
  - 엔진 태그·reasoning은 *제거 또는 옆에 작은 chip*
  - progress bar: active일 때 행 *하단에 1px 라인*
  - 케밥: `opacity-0 group-hover:opacity-100`로 hover 노출
- [x] **card variant 무변경** — 기존 사용처(없으면 reports의 today reflection block-row 등 검토) 호환

### B. day-view 적용
- [x] **BlockCard 호출에 `variant="compact"` 추가** — `<BlockCard block={b} variant="compact" onComplete={setCompletingBlock} />`
- [x] **SectionHeading "순서 변경" 액션은 유지** — compact가 들어와도 헤더는 동일

### C. WeekGrid 셀 간소화
- [x] **`Cell` 컴포넌트** — 분 + 카운트 텍스트 제거
- [x] **막대 강조** — 셀 전체를 *얕은 막대*로 변경. height 가득, 막대 background 색상으로 강도 표현
  - 빈 셀: `bg-pullim-slate-50` (현재 동일)
  - 채운 셀: 단일 막대 — 셀 height 가득, `width: ${barPct}%`, 색상 = `meta.colorVar`. 좌측 정렬
- [x] **native title 유지** — `title="2블록 · 100분"`
- [x] **`min-w-[58px]` → `min-w-[40px]`** — 7 col + 라벨이 420px 좌측 폭에 들어가도록
- [x] **라벨 열 폭** — `px-3` → `px-2`로 축소
- [x] **`overflow-x-auto` 유지** — 모바일 안전망

### D. 검증
- [x] `bunx tsc --noEmit` 통과
- [x] `bun run lint` 0 errors
- [x] 라이브 200 OK — `/planner`, `/planner?view=week`
- [x] 라이브 검증 (playwright):
  - day view 좌우 높이 차이 < 200px (이상적으로 < 100px)
  - week view 좌측 영역 안에 7요일 열 모두 노출 (가로 스크롤 없음)
  - WeekGrid 셀 hover 시 native title 노출 (마우스 hover 시뮬 어려우면 DOM `title` attr 검증)
  - BlockCard compact 행 height ~52~64px
- [x] 데스크톱(1280) 캡처 — day/week 영역 정합

## 본 plan 제외
- 월간 view 변경 (이미 정합 OK)
- BlockCompleteDialog 변경
- shadcn Tooltip 도입 — native title로 충분

## 트레이드오프 메모
- **케밥 hover 노출** — 모바일에서는 hover 없으니 *항상 노출*로 분기 필요. 또는 long-press 패턴(미구현). 본 plan은 *desktop hover + mobile 항상 노출*로 절충.
- **engine 태그 + reasoning 제거** — 정보 손실. 학생이 "왜 이 블록?"을 알기 어려워짐. 대안: reasoning만 유지(기존 b0/b3/b4에만 노출). 엔진 태그는 풀 카드 모드(reports·관리 페이지 등)에서만.
- **WeekGrid 막대만** — 시간량 비교는 막대 길이로. 정확한 분 숫자가 필요하면 hover. 학생의 95% 케이스는 *시각 비교*로 충분(가설).
