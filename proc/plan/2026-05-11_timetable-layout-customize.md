# 풀림 플래너 — 시간표 주간 레이아웃 옵션

## 목표

플래너 단위로 *주간* 시간표 레이아웃을 4종 중 선택할 수 있게 한다. PR #1(일간 레이아웃 4종 + 팔레트 7종, 매니지 페이지 진입)과 동일 패턴을 주간으로 확장.

## 배경

원래 본 파일은 `proc/spec/2026-05-11_timetable-layout-customize.md`로 시작된 spec-grade 문서였음(일간 4종 + 주간 4종 + 빌더 통합 + 페르소나·디자인 토큰까지). 그중 *일간 4종 + 매니지 진입*은 PR #1 ([feat/timetable-decorate](https://github.com/curea-co/pullim-planner/pull/1))로 다른 형태로 흡수돼 merge됨:

| 본 spec 원안 | PR #1 실구현 |
|---|---|
| 빌더 탭 진입 (`/manage/[id]/edit`) | 매니지 페이지 상단 섹션 (`/planner/manage`) |
| `Planner.layout = { day, week }` | `Planner.customization = { layoutId, paletteId }` |
| 일간: `side-24h` / `stack-chip` / `color-block` / `none` | `vertical_timeline` / `checklist` / `block_cards` / `pie_list` |
| 주간: `matrix-by-type` / `school-grid` / `bar-week` / `heatmap` | **미구현** |
| 팔레트 차원 — 없음 | 7종 팔레트 추가 |

→ 본 plan의 잔여 작업은 **주간 레이아웃 4종 + 데이터 모델 확장 + 매니지 통합**. (선택) 빌더 진입점 추가는 별도 항목.

## 주간 레이아웃 옵션 4종

| 코드 | 이름 | 기반 컴포넌트 | 설명 |
|---|---|---|---|
| `matrix_by_type` *(default)* | 타입×요일 매트릭스 | `WeekGrid` (기존) | 행=블록 타입, 열=요일, 셀=학습 시간 막대 |
| `school_grid` | 학교형 교시×요일 | 신규 | 행=교시, 열=요일, 셀=과목명 |
| `bar_week` | 요일별 막대 | `WeeklyChart` (기존) 활용 | 7일 × 총 학습 시간 막대 |
| `heatmap` | 시간×요일 히트맵 | `MonthHeatmap` 응용 | 행=시간대(2시간 단위), 열=요일, 셀=학습 강도 |

## 데이터 모델 확장

현재: `customization = { layoutId, paletteId }` (일간 한정).
확장 방향: `customization.weekLayoutId` 필드 추가 (옵션 A). 기존 `layoutId`는 일간 의미 유지 → backward compatible.

```ts
customization?: {
  layoutId: LayoutTemplateId;       // 일간 (PR #1)
  weekLayoutId?: WeekLayoutId;      // 신규 (이 plan)
  paletteId: PaletteId;
};
```

## 작업 항목

### 데이터 모델
- [ ] `src/lib/tokens/week-layouts.ts` — 4종 메타 (id/label/description/glyph)
- [ ] `src/lib/mock/planner.ts` — `customization.weekLayoutId` 필드 추가 + 시드 3건 디폴트
- [ ] `src/lib/mock/planner.ts` — `updatePlannerCustomization` 시그니처에 `weekLayoutId` 포함
- [ ] `src/lib/mock/index.ts` — 신규 심볼 재export
- [ ] `src/lib/hooks/use-planner-customization.ts` — return 타입에 `weekLayoutId` 추가

### 주간 레이아웃 컴포넌트
- [ ] `src/components/planner/layouts/week/matrix-by-type.tsx` — 기존 `WeekGrid` 래핑 (paletteId/compact)
- [ ] `src/components/planner/layouts/week/school-grid.tsx` 신설 (교시×요일 격자)
- [ ] `src/components/planner/layouts/week/bar-week.tsx` 신설 (`WeeklyChart` 재사용)
- [ ] `src/components/planner/layouts/week/heatmap.tsx` 신설 (`MonthHeatmap` 응용)
- [ ] `src/components/planner/layouts/active-week-layout.tsx` — weekLayoutId 분기 스위처

### 매니지 페이지 통합
- [ ] `decorate-section.tsx` — 미리보기에 *주간* 토글 추가 (일간/주간 탭 또는 좌우 듀얼)
- [ ] `decorate-section.tsx` — `LayoutControl`을 일간/주간 듀얼로 확장 (또는 별도 `WeekLayoutControl`)

### 적용
- [ ] `src/components/planner/views/week-view.tsx` — `getActiveCustomization().weekLayoutId` 분기 → `ActiveWeekLayout` 렌더

### (선택) 빌더 통합 — 별도 의사결정 필요
- [ ] `/planner/manage/[id]/edit` 안 "레이아웃" 탭 신설
- [ ] `PlannerCard` 메뉴 "꾸미기" 액션을 빌더 탭으로 이동 vs 현 매니지 섹션 유지

### 검증
- [ ] `bunx tsc --noEmit && bun run lint`
- [ ] `bun dev` (3030) — 매니지 페이지에서 주간 레이아웃 4종 토글 × 팔레트 7종 → `/planner?view=week` 진입 시 활성 플래너 설정 반영

## 의사결정 필요 (착수 전)

- **D1** 데이터 모델: `weekLayoutId` 필드 추가 / `layoutId`를 `{ day, week }` 객체로 변경?
- **D2** `school_grid`·`heatmap` 디자인 디테일: 교시 정의(N교시까지?), 히트맵 시간 단위(2h? 1h?)
- **D3** 매니지 페이지 UI: 일간/주간 탭 / 좌우 듀얼 / 별도 카드?
- **D4** 빌더 통합 (선택) — 진행 / 보류?

## 참고

- 본 plan의 원본(spec-grade)은 git history 참조: `2026-05-11` 시점 `proc/plan/2026-05-11_timetable-layout-customize.md` 이전 revision. 페르소나 분석(A/B/C/D), 옵션 카피, 디자인 토큰 등 spec-grade 콘텐츠 보존.
- 공스타그램 50장 분석: [`proc/research/2026-05-08_gongstagram-timetable-reference/report.md`](../research/2026-05-08_gongstagram-timetable-reference/report.md)
- 선행 PR: [PR #1 feat/timetable-decorate](https://github.com/curea-co/pullim-planner/pull/1)
