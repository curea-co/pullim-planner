# 회고/리포트 강화

## 목표
`/planner/reports` 영역의 콘텐츠를 풍부하게 — 이미 보유한 mock 데이터의 UI 활용도를 끌어올리고, 부모 공유의 가치 + 학생의 retention 동력으로 작동하게 한다.

## 배경
- 라우트·셸은 갖춰져 있음: 3 view(day/week/month) + `부모님께 보내기` CTA + Consent dialog
- 컴포넌트: `TodayReflection` · `WeeklySummary` · `MonthlySummary` · `ReportsShell` · `ConsentDialog`
- mock(`planner.ts`)에 회고 데이터가 이미 풍부:
  - `dailyReflection()` — 일일 메트릭 (학습 시간 / 완료율 / 정답률 / 감정 평균)
  - `tomorrowDifferences()` — "내일 어떻게 다르게" 인사이트
  - `weeklyStudyHours` · `weekView` — 주간 그리드
  - `monthView` · `getNextMilestone()` — 월간 + 마일스톤
  - `todayBurnout` · `todayCondition` — 컨디션·번아웃 (회고 trend로 연결 가능)
- audit 리포트에서 "콘텐츠 얕음"으로 지적된 영역. 데이터가 있는데 UI가 못 따라잡은 상태일 가능성

## 작업 항목

### 1단계 — 갭 분석 (1h)
- [ ] `today-reflection.tsx` · `weekly-summary.tsx` · `monthly-summary.tsx` spot check — 각 컴포넌트가 어느 mock 데이터를 활용하는지 매핑
- [ ] mock 데이터 vs UI 노출 비교표 — 어느 데이터가 미노출인지 식별
- [ ] 페르소나 시나리오 검토 — "학생이 오늘 reports 보고 뭘 얻어야 하는가?" / "부모는 어느 정보를 받아야 의미 있는가?"
- [ ] viewport 캡처(desktop + mobile) — 어제 audit 방식 재활용

### 2단계 — 우선 fix 도출 (30분)
- [ ] 갭 분석 결과로 fix 후보 3~5개 추출 (impact × 작업량)
- [ ] 후보 예시:
  - 일간 회고에 `tomorrowDifferences` 카드 노출 (이미 mock 있음, UI 누락 추정)
  - 주간 요약에 학습 시간 vs 목표선 차트 강화
  - 월간 요약에 마일스톤(시험·모평) 타임라인
  - 번아웃 trend 미니 차트 (condition + burnout 누적)
  - 부모 전송 카드 컨텐츠 큐레이션 (consent 후 어떤 정보를 어떻게)
- [ ] 사용자 검토 → 첫 fix 1~2개 확정

### 3단계 — 첫 fix 구현 (1~2h)
- [ ] 확정된 fix 1~2개를 한 PR로 묶어서 진행
- [ ] 나머지는 후속 plan(`2026-MM-DD_reports-followup.md`)으로 분리

### 검증
- [ ] `bunx tsc --noEmit && bun run lint` 통과
- [ ] 3 view 모두 viewport 시각 검증 (desktop + mobile)
- [ ] mock 데이터 활용도 before/after 비교 — 어떤 데이터가 새로 노출됐는지 명시

## Vercel 사후 (별개, 지속 모니터링)
- main 자동 배포 webhook 작동 안 함 (오늘 verify 결과: 새 commit 미반영). 머지 후 수동 Promote 필요
- Settings → Git Production Branch 설정 재확인 필요

## 참고
- reports 컴포넌트: `src/components/planner/reports/` (reports-shell, weekly-summary, monthly-summary, consent-dialog)
- 일간 회고: `src/components/planner/today-reflection.tsx`
- mock 회고 영역: `src/lib/mock/planner.ts` L254~ (DailyReflectionMetrics 이하)
- 도메인 권위 문서: `input/docs-archive/08_풀림_플래너_핸드오프.md`
