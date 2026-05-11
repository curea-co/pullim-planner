# 풀림 플래너 Reports 본구현 (학생 Phase 1)

## 목표
`/planner/reports` ComingSoon 제거 → 일/주/월 회고 통합 표면. 학생이 *주간 학습 흐름·정답률 추세·약점 정복·감정 곡선*을 한 페이지에서 볼 수 있게. "부모님께 보내기" 자녀 승인 trigger 포함 (실제 부모 영역 라우트는 별도 plan).

## 의사결정 (2026-05-08, 사용자 동의)
- 옵션 B (학생 + 학부모) Phase 1+2 분할 진행 — 본 plan은 Phase 1 학생측만
- 학생 Reports는 게이팅 없이 풀 무료
- 학부모 영역·역할 스위처·결제는 후속 plan으로 분리
- 수정 요청은 단순 알림만 (48h 자동 적용 배너 미구현)

## 작업 범위
`src/app/(student)/planner/reports/**`, `src/components/planner/reports/**`(신규), `src/lib/mock/family.ts`(신규 — 학생측 ConsentDialog용 최소 타입). 학부모 라우트·결제·shell 변경은 본 plan에서 제외.

## 작업 항목

### A. mock — `lib/mock/family.ts` 신규 (학생측 사용분만)
- [x] **타입** — `Parent`, `ChildLink`, `ConsentLog`, `ConsentType` 5종 + `consentTypeMeta`
- [x] **`currentParent`** — 서연 어머니 (id `parent_001`)
- [x] **`childLinks`** — `[{ parentId, studentId: 'student_001', primary: true }]`
- [x] **`consentLog`** — 빈 배열 (in-memory mutation). `getPrimaryParent()` 헬퍼 추가.
- [x] mock barrel `lib/mock/index.ts`에 `export * from './family'` 추가

### B. 컴포넌트 — `src/components/planner/reports/` 디렉토리 신규
- [x] **`reports-shell.tsx`** — 일/주/월 토글 + PageHeader + action 슬롯 (calendar-shell 변형). 시간 페이저 없음.
- [x] **`weekly-summary.tsx`** — 메트릭 4(학습 시간 / 정답률 / 약점 정복 / 감정) + WeeklyChart + AccuracyTrendChart + 약점 진도 + 인사이트 3
- [x] **`monthly-summary.tsx`** — KPI 3(완료한 날 / 연속 학습 / 시험까지 진척) + MonthHeatmap + 학습 시간 카드 + 마일스톤 카드 + 약점 단원
- [x] **`accuracy-trend-chart.tsx`** — Recharts LineChart, 7일 정답률 + 목표선 + 미래일 null 처리
- [x] **`consent-dialog.tsx`** — 5종 체크박스(`weekly_report` 등) + 만료 3옵션 + 수신자 카드 + 확정 시 `consentLog` push + toast

### C. 페이지 — `src/app/(student)/planner/reports/page.tsx` 본구현
- [x] ComingSoon 제거 (전체 rewrite)
- [x] `?view=day|week|month` 쿼리 파라미터 (week 디폴트, URL 동기화)
- [x] day view = `TodayReflection` 재사용
- [x] week view = `WeeklySummary`
- [x] month view = `MonthlySummary`
- [x] 헤더 action에 "부모님께 보내기" 버튼 → ConsentDialog 트리거

### D. nav-config 정리 — *공유 영역 최소 변경*
- [x] `nav-config.ts:120` `locked: true` 제거 + description "주/월간 추세" → "일·주·월 회고 + 부모 공유"

### E. 검증
- [x] `bunx tsc --noEmit` — exit 0 (Recharts Tooltip formatter 타입 1건 수정 후)
- [x] `bun run lint` — 플래너 도메인 0 errors
- [x] 라이브 200 OK — `/planner/reports`, `?view=day|week|month`
- [x] 라이브 인터랙션 (playwright):
  - 헤더 "이번 주 회고" / 탭 일간·주간·월간 / 주간 default selected ✓
  - 메트릭/차트/인사이트/부모 버튼 모두 노출 ✓
  - "부모님께 보내기" → ConsentDialog 열림 (제목 "부모님께 보내기", 체크박스 5, 기본 체크 2, 만료 라디오 3, 어머니 수신자 표시) ✓
  - "카톡 전송" → 모달 닫힘 + toast "📨 어머니께 카톡으로 전송됐어요 / 2개 항목 · 이번 주만 동의" ✓
  - 월간 view → "이번 달 회고" 헤더, KPI 3 / 히트맵 / 학습 시간 카드 / 다가오는 마일스톤 / 약점 단원 진도 모두 노출 ✓
- [x] 모바일(390×1300) 캡처 — `planner-reports-week-mobile.png`. 메트릭 4종(2×2 grid) + 막대 차트 + 라인 차트 + 약점 진도 4건 + 인사이트 3건 모두 가로 overflow 없이 정렬. 콘솔 errors 0 (warnings 4 — Recharts width 첫 페인트, 알려진 폴리시)

## 본 plan 제외 (후속)
- 학부모 영역 `(parent)/*` — Plan B
- AppHeader 역할 스위처 — Plan B (shell 변경)
- 토스페이먼츠 결제 mock — Plan C
- 자녀 상세 리포트 학부모 게이팅 — Plan C
- 자녀 측 *부모로부터의 수정 요청 알림* 수신 — Plan B에서 단순 알림만
