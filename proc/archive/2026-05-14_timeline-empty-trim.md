# Audit #5 — 타임라인 빈 시간대 trim

## 목표
`/planner` day-view의 vertical timeline이 진입 시 **첫 일정 1h 전 ~ 마지막 일정 1h 후**만 기본 노출하고, "전체 24h 보기" 토글로 풀 24h 복귀 가능하게 한다. mobile에서 위·아래로 빈 막대가 길게 보이는 시각적 dead space 해소.

## 배경
- audit Top #5 (`2026-05-13_prod-followup-and-next.md` C-1) — 어제 우선순위에서 밀린 항목
- 현재 `SideTimeline24`는 00:00~24:00 풀 48셀 grid + 첫 mount 시 06시 부근으로 auto-scroll만 적용. mock `todayBlocks`는 13:30~22:00 → 24h 중 **약 65%가 빈 셀**
- vertical_timeline은 default layout이라 *대부분 사용자*가 처음 보는 화면. 정보 밀도가 낮으면 reports day-view 진입 시 빈 페이지 인상(F1과 동일 패턴)
- 어제 reports 4단계(갭→fix후보→구현→archive) 패턴 재현

## 작업 항목

### 1단계 — 갭 분석 (완료)

#### 1.1 5 layout × 빈 시간대 영향 매트릭스

| Layout | 데이터 모델 | 빈 시간대 영향 | 현재 처리 | trim 가능? |
|---|---|---|---|---|
| **vertical_timeline** (`SideTimeline24`) | 24h × 30분 셀 grid (48셀) | 🔥 **High** — 00:00~13:30 (27셀) + 22:00~24:00 (4셀) = 31/48 비어 있음 | 06시로 auto-scroll | **YES** — first/last block 추출 |
| checklist | block list | 🟢 None — 블록 단위 row | 해당 없음 | N/A |
| block_cards | block list | 🟢 None — 블록 단위 카드 | 해당 없음 | N/A |
| pie_list | block 시간 집계 도넛+리스트 | 🟢 None — 비율 시각화 | 해당 없음 | N/A |
| (week) school_grid / bar_week / heatmap / matrix_by_type | 9교시 슬롯 / 요일 막대 / 요일×교시 / 요일×블록타입 | 🟢 None — 빈 시간대 개념 없음 | 해당 없음 | N/A |

**결론**: trim은 `SideTimeline24` 단일 컴포넌트 변경. 다른 4 day-layout + 4 week-layout 변경 없음.

#### 1.2 SideTimeline24 사용 지점

| 사용처 | compact | 영향 |
|---|---|---|
| `views/day-view.tsx` (vertical_timeline 활성 시) | false | 🔥 핵심 — 토글 노출 |
| `app/(student)/planner/onboarding/page.tsx` | false | 🟡 데모성 — trim 적용 (토글 노출은 선택) |
| builder 미리보기 (`ActiveDayLayout` compact=true) | true | 🟡 compact는 max-h-[220px]라 trim 효과 크지 않음 — trim default ON, 토글은 숨김 |

#### 1.3 mock 첫/마지막 일정 추출 로직 현황

- `nextActiveBlock()` 있음 — 다음 활성 블록 (start 기준)
- `plannerProgress()` 있음 — done/total
- **첫·마지막 블록 추출 헬퍼 없음** → trim 로직 안에서 `Math.min/max(...starts/ends)`로 inline 처리하거나, `getDayTimeRange(blocks)` 헬퍼 신설 가능. 헬퍼는 컴포넌트 내부 함수로 충분 (다른 곳에서 재사용 없음).

### 2단계 — 토글 UX 후보 3안 (G4 합의 대기)

#### 후보 비교

| # | 옵션 | default | 토글 위치 | 토글 라벨 | compact 동작 |
|---|---|---|---|---|---|
| **A** | 헤더 우측 보조 토글 (Eye 토글 옆) | trim ON | "오늘 일과" 헤더 우측, `색상 범례` 옆 | `전체 24h` / `핵심 시간만` (clock icon) | trim ON 유지, 토글 숨김 |
| **B** | 사이드 트래커 하단 footer 링크 | trim ON | grid 박스 *아래*, 별도 footer row | `▼ 전체 24시간 보기` | trim ON 유지, footer 숨김 |
| **C** | 빈 영역 inline collapse bar | trim ON | grid 박스 안 위·아래에 회색 collapsed bar | `06:00 이전 (27 셀) ▾` 식 inline 클릭 | trim ON 유지, bar 숨김 |

#### 트레이드오프

| 기준 | A | B | C |
|---|---|---|---|
| 발견성 (affordance) | 🟡 헤더 영역 끼지만 작음 | 🟢 별도 row라 큼 | 🟢 inline이라 가장 즉시적 |
| 시각 노이즈 | 🟢 작음 (헤더 한 줄) | 🟡 박스 밑에 한 줄 추가 | 🔴 박스 안 회색 bar 2개 추가 (위·아래) |
| 구현 복잡도 | 🟢 useState 1개, 헤더 토글 추가 | 🟢 useState 1개, footer 추가 | 🟡 useState 2개 (위·아래 독립), bar 컴포넌트 신설 |
| onboarding 영향 | 🟢 토글만 추가 (헤더 있음) | 🟢 footer 추가 | 🟢 inline bar 추가 |
| 빌더 미리보기 영향 | 🟢 헤더 자체가 compact에서 숨김 → 자연스러움 | 🟡 footer 따로 숨겨야 함 | 🟢 bar도 compact에서 숨겨야 (자연스러움) |
| **추천도** | ★★★ | ★★ | ★ |

#### 추천 — A
- 헤더에 이미 `색상 범례` Eye 토글 있음 → 동일 위계의 보조 토글 추가는 시각 일관성
- compact에서 헤더가 안 보이는 게 default이므로 빌더 미리보기 처리 불필요
- 구현 ~15분, 풀스택 1개 PR로 마무리 가능

후보 미정 시 **A** 기본으로 진행 — 풀스택 위임.

### 3단계 — 구현 (사용자 후보 확정 후, 후보 A 기준)

- [ ] `SideTimeline24`에 `trimToBlocks?: boolean` prop 추가 (default false — 기존 호출부 영향 없음)
- [ ] trim 활성 시 셀 범위 계산:
  - `firstMin = max(0, min(blocks.start) - 60)`
  - `lastMin = min(24*60, max(blocks.end) + 60)`
  - 30분 단위로 floor/ceil → `startCell`, `endCell`
  - `TOTAL_CELLS` 자리에 `endCell - startCell` 만큼만 그리고, 시간 라벨도 동기 조정
  - `nowOffset`은 `(nowMinutes - startCellMin) / HALF_HOUR * CELL_HEIGHT` 로 재계산 (음수면 라인 숨김)
  - auto-scroll은 trim 시 불필요 (이미 잘려 있음)
- [ ] `day-view.tsx`에 `const [trim, setTrim] = useState(true)` + 헤더에 토글 버튼 (Eye 토글 동일 패턴)
- [ ] `VerticalTimelineLayout`에 `trimToBlocks` prop pass-through
- [ ] `ActiveDayLayout`에서 `compact === true`일 때 `trimToBlocks: true` 강제
- [ ] onboarding 페이지: `<SideTimeline24 ... trimToBlocks />`로 적용 (정적 데모도 trim 일관)

### 4단계 — 검증 & 머지
- [ ] `bunx tsc --noEmit && bun run lint`
- [ ] mobile(375) + desktop(1440) × vertical_timeline 캡처 — trim 전후 비교, 토글 클릭 시 풀 24h로 복귀
- [ ] 4개 day-layout(checklist/block_cards/pie_list 외 + vertical_timeline) 시각 회귀 없음 확인
- [ ] 빌더 미리보기 4종 layout 정상 (vertical_timeline은 trim default)
- [ ] PR (#11 예상) → main 머지
- [ ] (사용자 명시 시) plan archive 이동

## 후속 (별개)
- A·B·D 산출물은 본 plan과 분리. A는 user action 필수, B는 production 캡처(knowhow), D는 knowhow 문서 마무리.
- audit Top #6 이하 항목은 다음 plan으로.

## 참고
- 어제 archive: `proc/archive/2026-05-13_prod-followup-and-next.md` (C-1으로 예고됨), `2026-05-13_reports-enhancement.md` (동일 4단계 패턴)
- 핵심 파일: `src/components/planner/side-timeline-24.tsx`, `src/components/planner/views/day-view.tsx`, `src/components/planner/layouts/vertical-timeline.tsx`, `src/components/planner/layouts/active-day-layout.tsx`, `src/app/(student)/planner/onboarding/page.tsx`
- mock todayBlocks 범위: 13:30 ~ 22:00
