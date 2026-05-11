# 2026-05-07 버튼 어포던스 회귀 정리 (풀림 플래너)

> **상태**: 🟢 완료 (2026-05-07, 라이브 검증 통과 — 4건 fix, hero CTA 추가 발견 포함)
> **명세 권위**: [08-design-system.md § 7.3](../spec/08-design-system.md), [04-ux-flow.md § 6.4](../spec/04-ux-flow.md)
> **부모 plan**: [2026-05-06_button-affordance-q-domain.md](2026-05-06_button-affordance-q-domain.md)
> **분류**: **풀림 플래너 도메인 락인 작업**

## 목표

§ 7.3 위반 사례를 풀림 플래너 도메인에서 § 7.3.3 Primary CTA 베이스라인으로 전환.

## 작업 항목

### Step 1: 회귀 사례 식별 (이미 grep 완료)

3건 후보:

- [x] **`src/app/(student)/planner/onboarding/page.tsx:55`** — 온보딩 CTA
  - 현재: `bg-white text-pullim-blue-700 mt-2.5 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold`
  - 처리: `rounded-xl px-4 py-2.5 text-sm`. 11px 폰트는 Compact 본문 16px 베이스라인([08 § 3.4](../spec/08-design-system.md))도 동시 위반 — 텍스트 사이즈 격상.
- [x] **`src/components/planner/block-card.tsx:115`** — 블록 카드 안 액션
  - 현재: `inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors`
  - 처리: 코드 컨텍스트 (variant/색상)를 먼저 확인. 액션이면 `rounded-lg px-4 py-2.5 text-sm`로 상향. 카드 안 보조 액션이면 `ghost` variant 텍스트 링크 패턴 검토.
- [x] **`src/components/planner/views/day-view.tsx:47`** — 데이뷰 액션
  - 현재: `bg-pullim-blue-600 inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-xs font-bold text-white shadow-sm`
  - 처리: `rounded-xl px-4 py-2.5 text-sm`로 상향. blue-600은 브랜드 Primary 적합.

### Step 2: 추가 grep — 다른 알약 모양 액션

- [x] `grep -rn "rounded-full" "src/app/(student)/planner/" "src/components/planner/" "src/components/planner-builder/" --include="*.tsx" | grep -v "text-xs"` 로 다른 사이즈 알약 액션 추가 점검 (text-xs 외에도 액션을 알약 모양으로 박은 경우 있을 수 있음)
  - **추가 발견**: `src/app/(student)/planner/page.tsx:104` 홈 hero "지금 시작하기" Primary CTA가 `rounded-full + text-sm + bg-white`. § 7.3.2 알약 금지 패턴이라 `rounded-xl px-4 py-2.5`로 격상.
  - 스킵: status badge·tag·진행바·원형 게이지·필터 칩(`step-content.tsx:283` 점수 선택 토글) 등은 § 7.3.2 태그/뱃지 패턴 적합.

### Step 3: 처리 표 (진행하면서 누적)

| 위치 | 분류 | 변경 전 | 변경 후 | 비고 |
|---|---|---|---|---|
| `planner/onboarding/page.tsx:55` | 액션 | `rounded-full px-3 py-1.5 text-[11px]` | `rounded-xl px-4 py-2.5 text-sm` | 11px 폰트 동시 격상 (§ 3.4) |
| `components/planner/block-card.tsx:115` | 액션 (카드 행 단위) | `rounded-full px-3 py-1.5 text-xs` | `rounded-lg px-4 py-2.5 text-sm` | 카드 내부 단일 액션 — Primary 경합 없음. 아이콘도 h-3→h-3.5로 텍스트 정렬 보정 |
| `components/planner/views/day-view.tsx:47` | 액션 | `rounded-full px-3 py-2 text-xs` | `rounded-xl px-4 py-2.5 text-sm` | bg-pullim-blue-600 유지 |
| `app/(student)/planner/page.tsx:104` | 액션 (Step 2 sweep 추가) | `rounded-full px-3.5 py-2 text-sm` | `rounded-xl px-4 py-2.5 text-sm` | hero "지금 시작하기" Primary CTA |

### Step 4: 검증

- [x] `pnpm exec tsc --noEmit` 통과
- [x] 라이브 검증 (2026-05-07): `/planner` hero "지금 시작하기" → `rounded-xl + text-sm` (Step 2 sweep 추가 발견 fix 확인). `/planner/onboarding` "▶ 지금 시작하기" → `rounded-xl + text-sm` (11px font 위반 동시 해소 확인). `/planner/calendar` (=`/day` redirect) day-view "지금 시작" `rounded-xl`, block-card "이어서/시작×4" `rounded-lg`. 모두 DOM evaluate로 className 검증.
- [x] after 캡처 (production build, Chrome headless):
  - [`output/live-shots/2026-05-07_planner-hero-after.png`](../../output/live-shots/2026-05-07_planner-hero-after.png) — `/planner` hero "지금 시작하기" `rounded-xl`
  - [`output/live-shots/2026-05-07_planner-onboarding-after.png`](../../output/live-shots/2026-05-07_planner-onboarding-after.png) — `/planner/onboarding` Step 2 "▶ 지금 시작하기" `rounded-xl + text-sm` (11px font 위반 동시 해소)
  - [`output/live-shots/2026-05-07_planner-calendar-after.png`](../../output/live-shots/2026-05-07_planner-calendar-after.png) — `/planner/calendar` (=`/day` redirect) day-view "지금 시작" + block-card "이어서/시작" 베이스라인 충족
  - before는 git rollback 불가, DOM evaluate가 추가 증거
- [x] 콘솔 에러 0건 — `/planner/onboarding`, `/planner/calendar`에 Clock24 SVG hydration mismatch 1건씩 발견되었으나 **사전 존재 이슈** (path 부동소수점 SSR↔CSR ULP 차이). 본 PR과 무관. **2026-05-07 같은 세션에서 별도 [`Clock24 hydration plan`](2026-05-07_clock24-hydration-mismatch.md)으로 fix 완료** (`r()` 정규화, 두 라우트 모두 errors=0 확인).

### Step 5: 명세 회귀 사례 갱신 (선택)

- [x] [08-design-system.md § 7.3.5](../spec/08-design-system.md) 회귀 사례에 플래너 처리 표기 — [`spec-regression-closing` plan](2026-05-07_spec-regression-closing.md)에서 처리 완료 (2026-05-07, hero CTA 추가 발견 포함)

## 락인 규칙

편집 OK: `app/(student)/planner/*`, `components/planner/*`, `components/planner-builder/*`
편집 금지: 다른 도메인

## 범위 외

- 풀림 Q (이미 처리), 라이브러리·클래스봇·shell — 별도 plan
- 베이스 컴포넌트 button variant 정비 — 글로벌 작업

## 비고

- block-card.tsx:115는 카드 안 보조 액션일 가능성 — 카드 안 Primary와 중첩 시 위계 재설계.
- 커밋 메시지: `fix(planner): action button affordance per 08 § 7.3.3`
