# 풀림 보호자 결제 — 토스페이먼츠 mock + 구독 게이팅

## 목표
- **결제 mock** — 토스페이먼츠 정기결제 SDK *흐름만* 시뮬. 실제 SDK 호출 없이 toast + 모달로 카드 등록 → 구독 활성 흐름 표현
- **구독 모델** — Free / Pro / Family 3 플랜 + 7일 무료체험. 월/연 결제 토글 (연 24% 할인)
- **자녀 상세 리포트 게이팅** — Free 시 *미리보기*(이번 주만) + "구독 unlock" 카드. Pro/Family는 풀 노출
- **`/parent/billing` 본구현** — 현 구독 상태 + 플랜 비교 + 결제·해지 흐름

## 작업 범위
- **신규**: `src/lib/mock/billing.ts`, `src/components/parent/billing-card.tsx`, `src/components/parent/plan-comparison.tsx`, `src/components/parent/toss-payment-dialog.tsx`, `src/app/(parent)/parent/billing/page.tsx`
- **수정**: `src/components/parent/subscription-placeholder.tsx` (BillingCard로 대체) → `(parent)/parent/page.tsx`, `(parent)/parent/child/[id]/reports/page.tsx` (게이팅), `src/components/shell/nav-config.ts` (billing locked 해제)

## 작업 항목

### A. mock — `lib/mock/billing.ts`
- [x] **`PlanId`** + `BillingCycle` + `SubscriptionStatus` 타입
- [x] **`PLANS`** 3건 — Free / Pro(월 12,900 / 연 119,000, recommended) / Family(월 19,900 / 연 189,000, best_value)
- [x] **`Subscription`** + `currentSubscription` (trial Pro 시작) + `updateSubscription()` in-memory mutation
- [x] **`billingHistory`** mock 2건 + **`mockTossPayment(planId, cycle)`** Promise (1.5초 delay 후 success — 데모 단순화)
- [x] **`isPaidPlan` / `findPlan` / `formatKRW`** 헬퍼

### B. BillingCard — `components/parent/billing-card.tsx`
- [x] 4 status 분기 (trial/active/paused/expired) — lemon CTA / 화이트 CTA / warn 톤
- [x] "결제 카드 등록" / "플랜 관리" / "구독 다시 시작" 라벨 분기
- [x] `SubscriptionPlaceholder` 제거 → 학부모 홈에서 BillingCard로 대체

### C. PlanComparison — `components/parent/plan-comparison.tsx`
- [x] 3 플랜 카드 + recommended/best_value 배지 + 월/연 토글 (-24% 할인 표시)
- [x] 현 플랜 "현재 활성" 비활성 / Free "기본 제공" 비활성 / 그 외 "X 플랜으로 시작하기"
- [x] 연 결제 시 "월 환산 X,XXX원" 부가

### D. TossPaymentDialog — `components/parent/toss-payment-dialog.tsx`
- [x] 카드 번호 / 만료 / CVC 입력 + "테스트 카드 자동 채우기" 버튼
- [x] 자동 결제·환불 약관 체크
- [x] mockTossPayment 호출 → loading state → success/fail toast + 구독 active 갱신
- [x] target null narrow → local const 캡처로 closure type-safe

### E. 결제 페이지 — `(parent)/parent/billing/page.tsx`
- [x] 현재 구독 카드 — 4 status 분기 + 다음 결제·체험 종료·이용 종료 라벨 + 카드 ••••
- [x] `<PlanComparison />` 통합
- [x] 결제 이력 — 카드 끝 4자리 + 금액 + 상태 (success/failed/refunded)
- [x] 해지 버튼 — `confirm()` → status='paused' + 토스트
- [x] `tick` state로 결제·해지 후 강제 re-render

### F. 자녀 상세 리포트 게이팅 — `components/parent/plan-gate.tsx` 신규
- [x] `PlanGate` 컴포넌트 — `isPaidPlan + (trial|active)` 체크
- [x] free 시 미리보기 (maxHeight 360 + linear-gradient mask) + 그 위에 UnlockCard
- [x] UnlockCard CTA → `/parent/billing` (lemon "7일 무료로 시작하기")
- [x] day view = 풀 무료, week/month = `<PlanGate>` 래핑

### G. nav-config — billing 잠금 해제
- [x] `parentNav`의 `/parent/billing` `locked: true` 제거

### H. 검증
- [x] `bunx tsc --noEmit` — exit 0 (target null narrow 1건 수정 후)
- [x] `bun run lint` — 학부모 영역 0 errors
- [x] 라이브 200 OK 8동선 — `/parent`, `/parent/billing`, `/parent/child/student_001/reports?view=day|week|month`, 회귀 `/`/`/planner/reports`/`/teacher`
- [x] 라이브 인터랙션 (playwright):
  - billing 페이지 — 현재 구독 "7일 무료 체험 중" + 3 플랜 (Free 기본 제공·Pro 현재 활성·Family 시작하기) + 결제 이력 2건 + 추천 배지 ✓
  - 월/연 토글 (-24% 표시) ✓
  - "Family로 시작하기" → TossPaymentDialog "Family 플랜 — 월 결제" + 결제 버튼 "19,900원 결제하기" ✓
  - 카드 자동 채우기 → 약관 체크 → 결제 → toast "✓ Family 플랜 활성화 완료 · 다음 자동 결제는 한 달 후" ✓
  - 페이지 갱신 시 "활성" 배지 + Family "현재 활성" ✓
  - 자녀 상세 리포트 (paid 상태) — 풀 weekly 데이터 노출, unlock 카드 미노출 ✓
- [x] 모바일(390×1100) 캡처 — `parent-billing-mobile.png`. 추천 배지 / Pro 카드 / Family 카드 / 결제 이력 모두 정렬, 가로 overflow 없음

## 추가 트레이드오프 메모 (검증 시 발견)
- **mock state는 module-level singleton** — 같은 세션 안에서는 mutation 유지되나 SSR 새 라우트 진입 시 reset 가능. 데모 한계로 수용.
- **toast description 카피 정정** — "한 월 후" → "한 달 후"로 자연스럽게 수정.

## 본 plan 제외
- 실제 토스페이먼츠 SDK 통합 (외부 키/서버 endpoint 필요)
- 카드 등록 *진짜 검증* (mock placeholder)
- 부분 환불·기간 변경
- 다른 자녀 추가 (Family 플랜의 다자녀)

## 트레이드오프 메모
- **카드 입력 UI를 본구현할지** — 데모라 placeholder + 자동 채움. 실제 입력 검증은 토스 SDK 책임
- **구독 mutation 영속성** — in-memory only. 페이지 전환 시 초기화 가능. 일관 데모 패턴
- **게이팅 강도** — 학생 측 Reports는 풀 무료 유지(retention 우선). 학부모 측만 게이팅
