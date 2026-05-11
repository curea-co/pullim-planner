# 풀림 플래너 다중 시간표 — Plan 1: 데이터 모델

## 목표
학생이 N개 플래너(시간표)를 동시에 관리할 수 있는 *데이터 모델*을 구축. 활성/비활성/아카이브 상태, CRUD 헬퍼, 기존 단일 플래너 가정과의 호환 레이어.

본 plan은 다음 3 plan의 *기반*. 본 plan만으로는 UI 변경 없음.

## 전체 IA 재구성 맥락 (4 plan 시리즈)
사용자 결정(2026-05-08): 학생 측을 단일 플래너에서 다중 플래너로 확장.

```
풀림 플래너 (변경 후)
├─ 홈 (/planner)            = 활성 플래너 시간표 (일/주/월 토글, 기존 calendar 흡수)
├─ 시간표 관리 (/planner/manage) = N개 플래너 카드 + CRUD + 빌더(하위)
│   ├─ /manage/new                 = 새 시간표 (현 builder 이전)
│   └─ /manage/[id]/edit            = 기존 시간표 수정
├─ 리포트 (/planner/reports)      그대로
└─ 소개하기 (/planner/onboarding)  그대로
```

| Plan | 범위 | 의존성 |
|---|---|---|
| **1. 데이터 모델** (현 plan) | mock `planners[]` + 활성 관리 + 호환 레이어 | 없음 |
| 2. IA 재구성 | nav-config + 라우트 redirect | Plan 1 (active 플래너 데이터) |
| 3. 시간표 관리 페이지 | `/planner/manage` 본구현 + 빌더 이전 | Plan 1, 2 |
| 4. 홈 = 시간표 통합 | `/planner`를 시간표로 흡수 | Plan 1, 2 (3은 독립) |

## 작업 범위
`src/lib/mock/planner.ts` 확장 + `src/components/planner-builder/builder-types.ts` 정합 검토. UI 변경 없음.

## 의사결정 (사용자 합의 필요한 항목 — plan 작성 단계에서 결정해 두기)

### D1. 활성 플래너 — 1개만 vs 다중 활성?
**결정**: 한 시점에 *오직 1개*만 활성. spec 03 §4.1 single-plan 가정 유지. 다중 활성은 시간 충돌·우선순위 복잡도 폭발.

### D2. 시간표 데이터(블록)는 어느 플래너에 속하나?
**결정**: 데모상 *활성 플래너만* `todayBlocks`를 가짐. 비활성 플래너는 *메타 + 빌더 폼*만 보유, 활성화 시 시간표 자동 생성 가정. 카드 미리보기는 메트릭만(D-day·과목 N개·기간).

### D3. 끝난 플래너 처리
**결정**: 시험 종료 후 자동 `archived: true` 플래그. 관리 페이지에 "지난 시간표" 토글로 노출. 데이터 보존(리포트 회고용).

### D4. 단일 플래너 가정의 기존 코드 호환
**결정**: 호환 레이어 헬퍼로 점진 이행. `getActivePlanner()` / `currentPersona.examLabel` derive. 기존 callsite는 점진적으로 새 헬퍼 사용으로 마이그.

## 작업 항목

### A. mock 타입 확장 — `lib/mock/planner.ts`
- [x] **`Planner` 타입** 신규
  ```ts
  type Planner = {
    id: string;
    name: string;                  // "6월 모의평가" / "1학기 기말고사"
    examType: ExamType;            // builder-types에서 import
    examLabel: string;
    examStartDate: string;         // YYYY-MM-DD
    examEndDate: string;
    target: { kind: 'grade'|'score'|'free', value: number | string };
    weekdayHours: { start: number; end: number };
    weekendHours: { start: number; end: number };
    subjectUnits: Partial<Record<SubjectKey, string[]>>;
    blockPattern: BlockPattern;
    weaknessAutoReflect: boolean;
    motivationStyle: MotivationStyle;
    motto: string;
    active: boolean;
    archived: boolean;
    createdAt: string;             // ISO
    updatedAt: string;
  };
  ```
- [x] **`planners: Planner[]`** mock — 3건 시드:
  - `pl_001` (active): "6월 모의평가" — 현재 페르소나의 메인 (D-27)
  - `pl_002` (inactive): "1학기 기말고사" — 학교 내신 (D-50)
  - `pl_003` (archived): "4월 학력평가" — 끝남 (D+9)

### B. 헬퍼 함수
- [x] **`getActivePlanner(): Planner`** — `planners.find(p => p.active && !p.archived)` (없으면 throw 또는 first 반환)
- [x] **`getPlanners(opts?: { includeArchived: boolean }): Planner[]`** — 카드 그리드용
- [x] **`activatePlanner(id: string): void`** — 다른 active를 false로, 해당 id를 true로 (in-memory mutation)
- [x] **`createPlanner(input: Omit<Planner, ...auto>): Planner`** — `pl_${Date.now()}` id, createdAt/updatedAt 자동
- [x] **`updatePlanner(id: string, patch: Partial<Planner>): void`**
- [x] **`deletePlanner(id: string): void`** — 활성 플래너는 삭제 불가 (다른 plan에서 가드)
- [x] **`archivePlanner(id: string): void`** — 시험 종료 자동/수동
- [x] **`duplicatePlanner(id: string): Planner`** — 이름 "{원본} (복사)"

### C. 호환 레이어 — 기존 단일 플래너 가정 유지
- [x] **`currentPersona.examLabel`** → 변경 없음 (페르소나 메타 그대로). active 플래너 examLabel과 같은 값으로 mock 시드.
- [x] **`getDday()`** → 활성 플래너 examStartDate 기반으로 변경하거나, 페르소나 그대로 유지(기존 callsite 호환). 결정: 호환 위해 *둘 다 같은 값*으로 시드. 점진 마이그.
- [x] **`todayBlocks`** → 변경 없음. 활성 플래너의 *오늘 시간표*임을 주석으로 명시.
- [x] **`PlannerForm`** (builder-types.ts) — `Planner` 타입의 *서브셋*임을 주석. 향후 통합 가능하나 본 plan에서는 별도 유지.

### D. mock barrel export
- [x] `lib/mock/index.ts`에서 신규 export 정합 (이미 `planner.ts` `*` export됨, 추가 작업 없음)

## 검증
- [x] `bunx tsc --noEmit` — exit 0
- [x] `bun run lint` — 플래너 도메인 0 errors
- [x] 기존 라우트 회귀 — 모든 plannersection 라우트 200 OK (`/planner`, `/planner/calendar`, `/planner/builder`, `/planner/reports`, `/planner/onboarding`)
- [x] `getActivePlanner()` 호출 시 `pl_001` 반환 검증 (간단 unit test 또는 페이지에서 console.log 데모)

## 본 plan 제외 (Plan 2~4)
- nav-config 변경 / 라우트 redirect / 빌더 위치 이전
- `/planner/manage` 페이지 신규
- 홈 = 시간표 통합
- 빌더 폼이 `Planner` 타입을 직접 사용하는 마이그레이션 (호환 레이어 유지)
