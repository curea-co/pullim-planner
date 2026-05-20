# 2026-05-19 — audit #10 카드 컬러 (weekly insight surface 통합)

## 목표

`/planner/reports?view=week`에서 인사이트 surface 2개가 시각 중복으로 노이즈 발생. F(PR #20)에서 도입한 `WeeklyInsights` 시그니처 카드(SPEC 11 § 6.1)가 페이지 최상단에 들어왔지만, `weekly-summary.tsx` 하단의 옛 "이번 주 인사이트" 섹션이 그대로 남아 있어 같은 페이지에 2개 인사이트 surface가 공존. 시각 톤도 다르다(상단 4 카드 tone-based vs 하단 ribbon 3톤).

audit #10 "카드 컬러"의 "전역 시각 결정" 부담을 surgical하게 회수 — 시그니처 1 surface만 남기고 옛 ribbon 제거.

완료 기준: `bunx tsc --noEmit && bun run lint` 통과 + reports week view에서 인사이트 카드 1 surface(WeeklyInsights)만 노출.

---

## 배경

- 2026-05-15 A-1 후보 5건 중 1건 (weekly-summary mobile / builder min-h / **카드 컬러** / onboarding redirect / reports day 정보감)
- F(2026-05-19 PR #20) 결과 `weekly-summary.tsx:33`에 `<WeeklyInsights />` 도입 → 페이지 최상단 신규 시그니처
- 옛 surface는 `weekly-summary.tsx:119~139` "이번 주 인사이트" 섹션 — `thisWeekInsights()` 동적 룰 4건을 `bg-pullim-blue-50` / `bg-pullim-success-bg` / `bg-pullim-warn-bg` 3톤 ribbon으로 렌더
- 결과: 페이지 최상단·중하단에 인사이트 카드 2개 surface, 시각 톤 불일치 ("4 시그니처 카드" vs "ribbon 리스트")

---

## 1단계 — 갭 분석 매트릭스

| 항목 | 상단 `<WeeklyInsights />` | 하단 `이번 주 인사이트` 섹션 |
|---|---|---|
| 출처 | F PR #20, SPEC 11 § 6.1 | 옛 surface (F 이전) |
| 데이터 | `weeklyInsights` 정적 4건 | `thisWeekInsights()` 동적 룰 0~4건 |
| 시각 | sm:grid-cols-2 카드 + tone별 색 + emoji + 액션 칩 | 좁은 ribbon 리스트 + 아이콘 + bg tone |
| 위치 | 페이지 최상단 (메트릭보다 위) | 페이지 하단 (약점 진도 다음) |
| 카피 톤 | 4원칙 준수 (관찰어·권유형) | 4원칙 준수 (이미 마이그) |
| 문제 | — | **중복 surface**: 같은 "이번 주 인사이트" 컨셉이 2 곳에 |

**갭**: 시그니처 surface가 도입됐는데 옛 surface가 페어 정리되지 않음. 카드 컬러 결정 이전에 **surface 수 자체가 페이지 톤을 결정**한다.

---

## 2단계 — fix 후보 3안

### 후보 A — 하단 섹션 제거 (시그니처 우선) ⭐ 추천

- `weekly-summary.tsx`에서 마지막 `<section>` (라인 119~139) 제거 + `thisWeekInsights` import 제거 + `insightIcon` 맵 제거
- 페이지 최상단 `<WeeklyInsights />`만 남음
- 변경 범위: weekly-summary.tsx 1 파일 / 약 -25 라인
- 효과: 인사이트 surface 1 곳으로 통일, 카드 컬러 변형(blue/success/warn ribbon) 3종 제거 → 카드 컬러 다양성 5종 → 2종으로 감소

### 후보 B — 두 섹션 합병 (동적 룰 보존)

- `WeeklyInsights` 컴포넌트가 `weeklyInsights` 정적 + `thisWeekInsights()` 동적을 모두 받아 합쳐서 보여줌
- 변경 범위: weekly-insights.tsx + weekly-summary.tsx + mock 4 파일 / 약 +40 라인
- 효과: 동적 룰 보존 + 시각 통일. 단 카드 수 4 → 6~8건 늘어나 페이지 첫 화면 압축됨
- 위험: 정적 시그니처와 동적 룰의 카피 톤/스타일이 안 맞으면 다시 노이즈

### 후보 C — 분리 유지 + 카드 컬러 차별화

- 상단 시그니처(WeeklyInsights) 그대로 유지
- 하단 ribbon은 헤딩 "관찰" 으로 카피 변경 + bg tone 톤다운 (slate-50/40 단일색)
- 변경 범위: weekly-summary.tsx 1 파일 / 약 ±10 라인
- 효과: 2 surface 유지하되 시각적으로 "시그니처 vs 보조" 역할 분리
- 위험: 여전히 중복 컨셉 surface, 카드 컬러 다양성은 그대로

---

## 3단계 — 풀스택 구현 (후보 A 채택)

후보 미정 시 추천 안(A) 진행 — daily_outcome 09:30 약속 명시 룰.

- [ ] `weekly-summary.tsx`에서 `thisWeekInsights` import 제거
- [ ] `insightIcon` 맵 제거 (`Sparkles`/`CheckCircle2`/`AlertTriangle`/`ReflectionInsight` import 정리)
- [ ] 마지막 `<section>` (인사이트 리스트) 제거
- [ ] `bunx tsc --noEmit && bun run lint` 통과
- [ ] `bun run build` production 빌드 통과

> `thisWeekInsights` 함수 자체는 mock에 잔존시킴 (day view `tomorrowDifferences` 패턴과 페어, 다른 화면에서 재활용 가능성)

---

## 4단계 — PR + production 반영

- [ ] 단일 commit `feat(reports): weekly view insight surface 중복 제거 (audit #10)`
- [ ] PR 생성 + 머지
- [ ] `vercel --prod --yes` 배포 (사용자 명시 슬롯)
- [ ] archive 이동은 사용자 명시 시에만 (메모리 룰)
