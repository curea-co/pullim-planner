# 풀림 플래너 다중 시간표 — Plan 3: 시간표 관리 페이지

## 목표
`/planner/manage` 본구현 — N개 플래너 카드 그리드 + 활성 전환 + CRUD(생성/수정/복제/삭제/아카이브). "관리" 컨셉을 UI로 표현.

## 의존성
- Plan 1 (데이터 모델) — `planners[]` + 헬퍼들
- Plan 2 (IA) — 라우트 골격, `/planner/manage/new`·`[id]/edit` 진입점

## 작업 범위
- **신규**: `src/components/planner-manage/*` (카드, 액션 메뉴, 삭제·복제 다이얼로그, 빈 상태)
- **수정**: `src/app/(student)/planner/manage/page.tsx` (placeholder → 본구현)
- **수정**: `src/app/(student)/planner/manage/[id]/edit/page.tsx` (빌더 with pre-fill)

## 의사결정

### D1. 카드 vs 리스트
**결정**: 카드 그리드 (lg:2~3열, 모바일 1열). N=2~5 정도가 데모 평균이라 시각적 카드가 자연.

### D2. 활성 전환 UX
**결정**: 카드의 "이 시간표 활성화" 버튼 또는 카드 클릭 → confirm 모달 ("활성 시간표를 X에서 Y로 변경하시겠어요? 홈 시간표가 즉시 갱신됩니다") → toast + 페이지 갱신. cycle 토글로 한 화면에서 즉시 변경 가능.

### D3. 카드에 노출할 메트릭
**결정**: 시험명·D-day·과목 N개·기간(weekday/weekend 시간)·업데이트 시각·블록 패턴. 활성 시 "🟢 활성" 배지, 아카이브 시 dimmed.

### D4. 삭제 가드
**결정**: *활성 플래너는 삭제 불가* — 삭제 메뉴 비활성 + tooltip "다른 플래너를 활성화한 뒤 삭제하세요". 아카이브된 플래너만 삭제 허용 (또는 모든 비활성).

### D5. 빌더 with pre-fill (수정 모드)
**결정**: `/planner/manage/[id]/edit`은 기존 빌더 컴포넌트 재사용. `useParams` id로 `findPlanner(id)` → `PlannerForm` 초기값 사용. 활성화 버튼 라벨은 "활성화"가 아닌 "변경 사항 저장".

### D6. 지난(archived) 시간표 노출
**결정**: 기본 hide. 헤더에 "지난 시간표 N개 보기" 토글로 노출. spec과의 정합 — 학생이 *시험 종료 후 회고용*으로 보존.

## 작업 항목

### A. 컴포넌트 — `src/components/planner-manage/*` 신규
- [x] **`planner-card.tsx`**
  - 헤더: 시험명 + active/archived 배지
  - 메트릭 4종: D-day, 과목 N개, 주간 시간 N시간, 업데이트 시각
  - 액션 케밥: 활성화 / 미리보기 / 수정 / 복제 / 아카이브 / 삭제
  - 활성 카드는 그라데이션 ring + "활성" 배지
- [x] **`activate-confirm-dialog.tsx`** — 활성 전환 confirm
- [x] **`delete-confirm-dialog.tsx`** — 삭제 confirm (active 가드)
- [x] **`empty-state.tsx`** — N=0일 때 "첫 시간표를 만들어보세요" + 빌더 진입 CTA

### B. 페이지 — `/planner/manage/page.tsx` 본구현
- [x] **PageHeader** — eyebrow "시간표 관리" + title "내 시간표" + 우측 액션 "+ 새 시간표 만들기"
- [x] **활성 표시 강조** — 첫 카드 자리에 "활성 시간표" 강조 영역
- [x] **그리드** — 비활성 플래너 카드들
- [x] **지난 시간표 토글** — `useState(false)` + 클릭 시 archived 카드 노출
- [x] **"+ 새 시간표 만들기"** — Link `/planner/manage/new`

### C. 빌더 with pre-fill — `/planner/manage/[id]/edit/page.tsx`
- [x] **`useParams` id 받기**
- [x] **`findPlanner(id)`로 초기값** + Planner → PlannerForm 어댑터 함수
- [x] **빌더 콘텐츠 재사용** (기존 `PlannerBuilderPage` 본문 import 또는 컴포넌트화)
- [x] **활성화 버튼 라벨** "변경 사항 저장" — id로 `updatePlanner(id, form)` 호출 → toast + `/planner/manage`로 redirect
- [x] **빌더 단계 의미 변경** — 활성화 단계가 "이 시간표를 지금 활성화"인지 "저장만"인지 분기

### D. 활성 전환 흐름
- [x] **PlannerCard "활성화" 클릭** → activate-confirm-dialog 열림
- [x] **confirm** → `activatePlanner(id)` + toast "✓ 활성 시간표 변경 — 홈 시간표가 갱신됩니다" + 페이지 강제 re-render
- [x] **현재 활성 카드는 활성화 메뉴 disabled**

### E. 삭제·복제·아카이브 흐름
- [x] **삭제** — confirm 모달 → 활성 가드 체크 → `deletePlanner(id)` + toast
- [x] **복제** — `duplicatePlanner(id)` 즉시 호출 + toast "✓ 복사본 만들어짐"
- [x] **아카이브** — `archivePlanner(id)` + toast (활성이면 가드)

### F. 모바일 반응형
- [x] 카드 그리드 1열 (모바일) / 2열 (lg)
- [x] 케밥 메뉴 모바일에서 노출 위치·크기

## 검증
- [x] `bunx tsc --noEmit` 통과
- [x] `bun run lint` 0 errors
- [x] 라이브 200 OK — `/planner/manage`, `/planner/manage/[id]/edit` (3건 시드 모두)
- [x] 라이브 인터랙션 (playwright):
  - 카드 3개 노출 (활성 1·비활성 1·아카이브 1 — "지난 시간표 보기" 토글로)
  - 비활성 카드 → "활성화" → 모달 → confirm → toast + 활성 배지 이동
  - "+ 새 시간표 만들기" → /planner/manage/new (빌더 진입)
  - 카드 → "수정" → /planner/manage/[id]/edit (빌더 pre-fill 검증)
  - 복제 → 카드 4개로 증가
  - 활성 카드 삭제 시도 → toast "활성 플래너는 삭제 불가"
- [x] 모바일(390×844) 시각 캡처 — 카드 그리드 1열 정렬

## 본 plan 제외 (Plan 4)
- /planner = 시간표 통합 (홈 변경)
- /planner/calendar redirect
- 활성 플래너 변경 시 *홈*에 즉시 반영 — Plan 4 본구현 후 검증

## 트레이드오프 메모
- **빌더 with pre-fill 분기 복잡도** — 활성화 단계의 의미가 "활성화" vs "저장"으로 갈라짐. PlannerForm을 Planner와 어댑터로 명확히 분리해 복잡도 통제
- **활성 전환 UX 마찰** — confirm 모달 대신 *즉시 토글*도 가능. 데모는 신중하게 confirm
- **N=0 빈 상태** — 신규 가입자 대비. 본 plan에 빈 상태 컴포넌트 포함
