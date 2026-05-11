# 풀림 플래너 시그니처 회복 + 인터랙션 정리

## 목표
"감정 지능 + 매일 재최적화 + 일주일 미리보기" 3대 시그니처가 표면에서만 반짝이는 현 상태를 — 컨디션·번아웃·빌더 Step 8이 실제로 작동하는 데모로 끌어올린다. 부수 인터랙션 dead-end도 락인 안에서 함께 정리.

작업 범위: `src/app/(student)/planner/**`, `src/components/planner/**`, `src/components/planner-builder/**`, `src/lib/mock/planner.ts`. 공유 영역(`components/study/*`, spec 문서, 온보딩 자동 진입 등)은 본 plan에서 제외.

## 작업 항목

### P0 — 시그니처 가치 회복
- [x] **컨디션 → 블록 난이도 전파** — `condition-slider.tsx`에 `onChange` 추가, day-view에서 받아 sonner 토스트 + clock-24 `conditionTone` prop으로 외곽 ring 색조 변화. id 부여로 중복 토스트 방지.
- [x] **번아웃 "쉴래요" 1-tap 핸들러** — shadcn Dialog 기반 모달. todo/doing 블록 이월 미리보기, AI 추천 분기, "확정" 시 toast.
- [x] **빌더 Step 8 일주일 미리보기 동적화** — `generatePreview(form, todayISO)` 헬퍼 신규. 7일 칩 + 일자별 4블록. examName·blockPattern·subjectUnits·weaknessAutoReflect 모두 반영. 시험 당일은 자동 종료 + 별도 안내.
- [x] **calendar-shell prev/next 비활성 해제** — `calendar/page.tsx`에서 onPrev/onNext 토스트 주입.
- [x] **`skipped` 블록 mock 1건 추가** — `b0` 13:30–13:55 영어 단어 복습(어제 누락분).

### P1 — 인터랙션 깊이
- [x] **clock-24 `now` prop 동기화** — `useEffect` + 60초 setInterval로 매분 갱신. SSR 첫 페인트는 18:50 fallback으로 hydration mismatch 회피.
- [x] **month-heatmap 셀 클릭 drill-down** — 셀이 button. 과거/오늘은 `/planner/calendar?view=day` 이동, 미래는 "초안 미리보기" 토스트.
- [x] **month-view 시험 카드 동적화** — `getNextMilestone()` 기반. 4월 9·18·30일 milestone 분포. importance(`high`/`mid`)에 따라 톤 분기.
- [x] **day-view "순서 변경" 버튼 정리** — "🛠️ 블록 순서 변경 — 준비 중" 토스트.
- [x] **pedagogy-tag 모달 a11y** — base-ui 기반 shadcn `Dialog`로 마이그레이션. ESC/focus-trap/overlay click 자동 처리.
- [x] **block-card 락 기능 진입 처리** — `findFeature(slug)?.stage === 'future'` 체크. 락 시 Lock 아이콘 + "준비 중" 비활성 버튼. mock의 legacy slug 의도 주석 추가.

### P2 — 폴리시
- [x] **Onboarding D-day stale 수정** — `getDday(currentPersona)` 동적화. clock-24 prop으로 `now="18:50"` 명시(캡처 안정).
- [x] **D-day 음수 분기 통일** — calendar/page에 `formatDday` 헬퍼, day/week/month 모두 동일 분기 사용.
- [x] **condition-slider semantic markup** — `role="radiogroup"` + 각 버튼 `role="radio"` + roving tabindex + 좌/우/상/하/Home/End 화살표 키.
- [x] **burnout-card factor unit 명시** — `BurnoutFactor.unit: 'h'|'%'|'/5'|'회'` 필드. `formatFactor` 함수가 직접 사용.
- [x] **week-grid 셀 hover/click drill-down** — 요일 헤더 셀이 button. 오늘은 day view 이동, 그 외 요일은 합계·완료율 토스트.

## 검증 (작업 마치기 전)
- [x] `bunx tsc --noEmit` — exit 0
- [x] `bun run lint` — 플래너 도메인 0 errors (다른 영역의 기존 lint 부채는 별도)
- [x] `lib/mock/domains.ts`의 planner `childSlugs` 정합 — 변경 없음
- [x] `lib/mock/features.ts:getFeatureRoute`가 todayBlocks의 모든 `linkedFeatureSlug` 처리 (`memory/conqueror/exam/visual/infinity` alias 모두 매핑) — 변경 없음
- [x] `nav-config.ts`의 `plannerSection` href 정합 — 변경 없음
- [x] 라이브 200 OK 7동선: `/planner`, `/planner/calendar`, `/planner/calendar?view=week|month`, `/planner/builder`, `/planner/onboarding`, `/planner/reports`
- [x] 라이브 인터랙션 검증 (playwright):
  - 컨디션 슬라이더 → 토스트 발생, clock ring stroke `var(--color-pullim-warn)`로 변화
  - 번아웃 "쉴래요" → 모달 열림, 이월 블록 3건 노출, ESC로 닫힘
  - Step 8 → 7일 칩 + "4/29 수" 4블록 (수학·미적분/영어·수능특강/과학·역학/수학·확률통계) 폼 입력 그대로 반영
  - 월간 시험 카드 "중요 시험 / 4월 30일 · 4월 학력평가 / 남은 6일" 동적 렌더
  - 월간 셀 클릭 → "📅 29일 초안" 토스트
  - 주간 헤더 클릭 → "📅 월요일 (21일) 4.2h 학습 · 완료 100%" 토스트
  - calendar prev → "이전 ◯" 토스트
- [x] 콘솔 errors 0 (warnings 2 — Recharts 첫 페인트 width=-1, P2 폴리시 잔여)
- [x] 모바일(390×844) 폭 시각 검증 — playwright fullPage 캡처 4장(`/planner`, `/planner/calendar?view=day` collapsed/expanded, `?view=month`). 모든 폭 가로 overflow 0, 핵심 정보 첫 화면 또는 1스크롤 내 도달

## 글로벌 작업으로 분리 (본 plan에서 제외)
- 코치 6 에이전트 이름 spec ↔ 코드 불일치 → Q 도메인 락인 또는 `/update-spec`
- Cross-Domain Transition Alert (spec 04 §6.5) → 베이스 모달 + 도메인 boundary 헬퍼 신규 (공유 영역)
- `today-block.tsx` 알약 CTA 회귀 → `components/study/*` 공유 영역
- spec 03 §3.1 + spec 10 §2.3 사이드바 IA drift → `/update-spec`
- 도메인 온보딩 자동 진입 로직 → 전 도메인 공통, localStorage 플래그
- `/planner/reports` 본구현 + Assistant RBAC 표현 → 별도 작업 (현 ComingSoon 유지)
