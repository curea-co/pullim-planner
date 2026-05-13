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

### 1단계 — 갭 분석 (완료)
- [x] `today-reflection.tsx` · `weekly-summary.tsx` · `monthly-summary.tsx` spot check
- [x] mock 데이터 vs UI 노출 비교표 작성
- [x] 페르소나 시나리오 검토 — 학생/부모 가치
- [x] viewport 캡처 (3 view × 2 vp = 6장, `/tmp/audit-reports/`)

#### 1.1 컴포넌트별 mock 활용도

| 컴포넌트 | 활용 mock | 평가 |
|---|---|---|
| TodayReflection | `dailyReflection`, `tomorrowDifferences`, `todayBlocks`, `blockTypeMeta`, `subjectLabels`, `emotionEmojis` | 컴포넌트 자체는 충실. 그러나 **default closed**라 reports day view 진입 시 텅 빈 페이지처럼 보임 |
| WeeklySummary | `weeklyStudyHours`, `weekView`, **`dailyReflection`(차용)**, `getWeakNodes` + `WeeklyChart` + `AccuracyTrendChart` | 4 메트릭 중 "평균 정답률" · "감정 평균"이 *오늘 데이터*. **진짜 주간 평균 아님**. 인사이트 3건은 **하드코딩** |
| MonthlySummary | `monthView`, `currentPersona.streakDays`, `getDday`, `getNextMilestone`, `getWeakNodes`, `weeklyStudyHours` + `MonthHeatmap` | KPI "100% 완료한 날 = 0일" — mock에 completionPct=100 케이스 없음. UI 자체는 풍부 |

#### 1.2 미노출·약하게 노출 mock

| Mock | 상태 | 갭 |
|---|---|---|
| `todayBurnout` (5개 지표) | **reports에서 미노출** | 시그니처 데이터인데 회고에서 보이지 않음 |
| `todayCondition` | **미노출** | 컨디션 trend 회고 없음 |
| `pedagogyEngineMeta` (7 학습 엔진) | **미노출** | "이번 주 가장 적용된 엔진" view 없음 |
| 진짜 주간 메트릭 함수 | **없음** | `weeklyReflection()` 신규 필요 (현재는 일간 차용) |
| `weeklyInsights` 동적 함수 | **없음** | `thisWeekInsights()` 같이 동적 생성 필요 |
| Reflection history (지난 주 비교) | **없음** | mock 보강 필요. retention 핵심 |

#### 1.3 시각·UX 갭

| 이슈 | 위치 | 영향 |
|---|---|---|
| Day view 진입 시 default closed → 텅 빈 화면 | `TodayReflection` `useState(allFinished)` | 🔥 High — reports day 진입 의미 약화 |
| Mobile에서도 동일 — 1줄만 보이고 나머지 viewport 빈공간 | day mobile | 🔥 High |
| Weekly metrics가 *오늘 데이터* 차용 → 부정확 | `WeeklySummary` L32 `dailyReflection()` | 🟡 Med |
| Weekly insights 3건 하드코딩 | `WeeklySummary` L22~26 | 🟡 Med |
| Month "100% 완료한 날" 0일 (mock 임계) | `monthView` mock + `MonthlySummary` 임계 | 🟡 Med |
| Burnout/Condition 데이터 reports에 없음 | 전반 | 🟡 Med — 시그니처 데이터 안 살림 |
| "부모님께 보내기" 후 *실제 전송 콘텐츠*가 미정의 | `ConsentDialog` 후속 | 🟡 Med |

### 2단계 — 우선 fix 도출 (사용자 확정 대기)

#### 후보 (impact × 작업량 정렬)

| # | fix | 영향 | 작업량 |
|---|---|---|---|
| F1 | **TodayReflection reports 모드에서 default expanded** — `defaultOpen?: boolean` prop 추가 또는 reports day view 안 별도 wrapper | 🔥 High | 15분 |
| F2 | **Weekly 메트릭을 진짜 주간 평균으로** — `weeklyReflection()` 함수 신설 (weekView 데이터 활용) | 🟡 Med | 30분 |
| F3 | **Weekly insights 동적 생성** — `thisWeekInsights()` 함수 (`tomorrowDifferences` 패턴) | 🟡 Med | 30분 |
| F4 | **Burnout·Condition trend 카드 추가** — Weekly 또는 Monthly에 시그니처 데이터 노출 (mock 보강 가능) | 🟡 Med | 1h |
| F5 | **부모 전송 콘텐츠 정의** — ConsentDialog 후 전송될 *부모용 요약 카드* (학생 view와 분리) | 🟡 Med | 1~2h |
| F6 | **Month "100% 완료한 날" mock·임계 조정** — completionPct≥95 케이스 추가 또는 임계 95로 완화 | 🟢 Low | 10분 |
| F7 | **Reflection history (지난 주 비교)** — mock 보강 + Weekly에 "vs 지난 주" 컬럼 | 🟢 Low | 2h |

- [ ] 사용자 확정 → 첫 fix 1~2개 (또는 묶음) 결정

### 3단계 — 첫 fix 구현 (사용자 확정 후)
- [ ] 확정된 fix를 한 PR로 묶어서 진행
- [ ] 나머지는 후속 plan으로 분리

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
