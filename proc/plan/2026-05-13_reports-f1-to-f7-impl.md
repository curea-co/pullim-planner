# Reports F1~F7 전체 구현

## 목표
오늘 갭 분석에서 도출된 F1~F7 fix 전건 구현 + production 반영 + plan/ 정리. 내일 새 작업할 수 있는 깨끗한 base 확보.

## 배경
- 1단계 갭 분석: `proc/plan/2026-05-13_reports-enhancement.md` 참조
- 7건 fix: Day default expand · Weekly metrics · Weekly insights · Burnout-Condition trend · 부모 콘텐츠 · Month 임계 · History 비교
- 단일 브랜치 `feat/reports-enhancement` + 단일 PR + commit 분리

## 작업 항목

### F1: TodayReflection default expanded (reports 모드)
- [ ] `TodayReflection`에 `defaultOpen?: boolean` prop 추가
- [ ] reports day view에서 `defaultOpen=true` 전달
- [ ] 홈 day view는 기존 동작 유지 (학습 완료 시만 자동 펼침)

### F2: Weekly 메트릭 실제 주간 평균
- [ ] `weeklyReflection()` 함수 신설 (`planner.ts` mock)
- [ ] WeeklySummary에서 `dailyReflection()` 차용 제거 → `weeklyReflection()` 사용

### F3: Weekly insights 동적 생성
- [ ] `thisWeekInsights()` 함수 신설 (`tomorrowDifferences` 패턴)
- [ ] WeeklySummary 하드코딩 3건 제거

### F4: Burnout·Condition trend 카드
- [ ] mock에 7일치 burnout trend 추가
- [ ] mock에 7일치 condition trend 추가
- [ ] WeeklySummary에 trend 미니 카드 추가 (또는 별도 컴포넌트)

### F5: 부모 전송 콘텐츠 정의
- [ ] mock에 `parentReportCard` 데이터 구조 + 함수 신설
- [ ] `ParentReportCard` 컴포넌트 신설 (학생 view와 분리, 큐레이션)
- [ ] ConsentDialog 후 전송 카드 preview 노출

### F6: Month "100% 완료한 날" 임계
- [ ] mock `monthView`에 `completionPct=100` 케이스 추가 (1~2일)

### F7: Reflection history (지난 주 비교)
- [ ] mock에 `lastWeekSummary` 추가
- [ ] WeeklySummary에 "vs 지난 주" 보조 텍스트 (메트릭 옆 또는 카드)

### 검증
- [ ] `bunx tsc --noEmit && bun run lint`
- [ ] Playwright 3 view × 2 viewport 캡처 (총 6장)
- [ ] Day default expand 확인
- [ ] Weekly 메트릭 진짜 주간 데이터 확인
- [ ] Burnout/Condition trend 노출 확인
- [ ] Month "100% 완료한 날" 0 이상 표시

### 배포
- [ ] PR `feat/reports-enhancement` 생성
- [ ] 자체 머지 (사용자 명시: "처음부터 끝까지 다 해서")
- [ ] `vercel --prod` 즉시 production 배포
- [ ] `verify-prod-pr7.mjs` 재실행 (회귀 X) + `verify-brand-prod.mjs` 75/75 PASS 유지

### 정리
- [ ] `today-remaining.md` archive
- [ ] `reports-enhancement.md` archive
- [ ] `prod-followup-and-next.md` archive
- [ ] 본 plan archive

## 완료 기준
- F1~F7 모두 production에 반영
- `proc/plan/` 비어있음
- 내일 새 기능 작업 가능한 base 상태
