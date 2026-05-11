# 풀림 플래너 일일 회고 표면

## 목표
day view 안에 *조건부* 회고 카드를 추가해 "오늘 무얼 했나 + 내일 뭐가 다른가"를 한 화면에서 보게. 별도 라우트 없이 day view의 collapsed ribbon 패턴(`ConditionBurnoutPanel`과 동일)으로 통일. 학습 완료 시 자동 expand, 학습 중에는 ribbon으로 *진행 상황 미리보기*.

작업 범위: `src/components/planner/today-reflection.tsx`(신규), `src/components/planner/views/day-view.tsx`, `src/lib/mock/planner.ts`, `src/components/planner/block-complete-dialog.tsx`(마감 CTA 연결).

## 작업 항목

### A. mock 헬퍼 — `lib/mock/planner.ts`
- [x] **`DailyReflectionMetrics` 타입** + 모든 필드 export
- [x] **`dailyReflection(blocks)`** — done은 expectedMinutes 전체, doing은 `progress` 비율로 actualMin 가중. break 제외. accuracy/emotion 평균 산출 (있는 블록만).
- [x] **`tomorrowDifferences(blocks)`** — 5종 룰 기반 인사이트 + 빈 결과 fallback. `{ icon: 'sparkle'|'warn'|'check', text: string }[]`. 최대 4건.

### B. TodayReflection 컴포넌트
- [x] **신규 `components/planner/today-reflection.tsx`** — `id="today-reflection"`. ribbon에 완료/평균정확도/감정 + "오늘 끝!" 배지(완료 시). 펼치면 메트릭 3 + 블록 리스트 + 인사이트 + CTA 2개. ConditionBurnoutPanel과 동일 ribbon 패턴.

### C. day-view 통합
- [x] **블록 리스트 아래 `<TodayReflection />` 렌더**
- [x] **자동 expand 조건** — `doingCount === 0 && todoCount === 0`일 때 default open

### D. BlockCompleteDialog → 회고 anchor 스크롤
- [x] **마감 CTA 연결** — `nextBlock`이 null일 때 `handleNext`에서 모달 닫고 `requestAnimationFrame` 안에서 `scrollIntoView` + ribbon `aria-expanded=false`인 trigger 자동 클릭으로 펼침

## 검증
- [x] `bunx tsc --noEmit` — exit 0
- [x] `bun run lint` — 플래너 도메인 0 errors
- [x] 라이브 200 OK 6동선
- [x] 라이브 인터랙션 (playwright DOM 분석):
  - ribbon 텍스트 "오늘 회고 1/7 완료 · 88% · 🙂" — 완료 카운트·평균정확도·감정 모두 표시 ✓
  - ribbon 클릭 → `today-reflection-body` 마운트 ✓
  - 메트릭 3종 — `1h 16m` / `88%` / `🙂 4.0` ✓
  - 인사이트 3건 — "평균 정답률 88% — 내일 새 단원" / "단어 복습 누락 — 내일 우선 재배치" / "오늘 흐름이 좋아요 — 내일도 비슷한 패턴" ✓
  - reasoning chip이 블록 리스트 row에 노출 (b0·b3·b4) ✓
  - anchor scroll — `block-complete-dialog.tsx` `handleNext` 안에서 nextBlock null일 때 `getElementById('today-reflection')` + `scrollIntoView` + `button[aria-expanded=false]` auto-click 코드 검증
- [-] 모바일(390×844) 시각 캡처 — playwright `take_screenshot`이 fonts.ready 후 timeout (mcp/세션 일시적 이슈). 동일 viewport·동일 환경의 직전 4장 캡처(`planner-mobile-{home,day-collapsed,day-expanded,month}.png`)는 정상이었음. 코드 검증으로 대체.
