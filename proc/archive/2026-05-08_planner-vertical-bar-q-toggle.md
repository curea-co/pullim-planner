# 풀림 플래너 — 주간 세로 막대 + Q 사용권 게이팅

## 목표
- **주간 그리드 셀 막대**를 가로 → **세로 막대**(bottom-up)로 변경. 시간량을 *높이*로 인지
- **플래너 ↔ Q는 각각 독립 결제 도메인**으로 가정. 플래너 안 학습 블록 CTA는 *Q 사용권 보유자*만 직접 풀이로 진입. 미보유 시 안내 + (향후) 구독 유도. 사용권 시뮬레이션 토글 UI는 본 plan 범위 외

## 사용자 피드백 (2026-05-08)
- "주간 시간표 가로가 아니라 세로로 시각적 바의 진행 형태를 변경"
- "기본적으로 플래너는 풀림 Q와 연동되어 있지 않음을 상정"
- 추가 보정: **"풀림 Q와 플래너는 독립된 별도의 서비스. '풀림' 플랫폼이 묶지만, 이용은 별개. Q 결제 안 하고 플래너에서 Q 이용하는 건 아니다"**

→ 메타포 보정: "연동 토글"이 아니라 **"도메인 사용권(entitlement)"** 모델
- default OFF의 의미: 사용자가 연동을 끈 상태 (X) → **Q 미구독으로 자동 잠김** (O)
- 향후 플랫폼 설정의 의미: 연동 스위치 (X) → **결제/구독 관리 + 데모용 시뮬레이션 토글** (O)

## 현재 상태

### WeekGrid 셀
```tsx
<div className="bg-pullim-slate-50 relative h-8 w-full overflow-hidden rounded">
  <div
    className="absolute left-0 top-0 h-full rounded-r"
    style={{ width: `${barPct}%`, background: color, opacity: 0.85 }}
  />
</div>
```
→ 가로 막대(`width: %`). 세로로 변경 필요.

### 플래너 ↔ Q 진입
- `BlockCard` (full + compact) CTA: `linkedFeatureSlug` → `getFeatureRoute()` → Q 도메인(`/q/*`)으로 즉시 진입
- `BlockCompleteDialog` "다음 블록 시작" CTA: 동일 패턴
- `DayView` 다음 블록 카드 "지금 시작" CTA: 동일 패턴
- 위 세 곳에 *사용권 게이팅* 필요. 외 다른 곳은 영향 없음(today-timeline은 day view로만 이동)

## 의사결정

### D1. 세로 막대 — cell height
**결정**: `h-8` → `h-12`로 키움. 세로 12 = 48px. 막대 시각 인지 가능. WeekGrid 전체 높이 약 30~40px 증가하나 좌우 align stretch로 자동 정합.

### D2. 막대 방향
**결정**: `bottom-0`로 anchor 후 `height: ${barPct}%`. 빈 셀은 옅은 배경만(현재 동일).

### D3. Q 사용권 mock — 데이터 모델
**결정**: `lib/mock/subscriptions.ts` 신규 (도메인 사용권 모델)
- `DomainSubscriptions` 타입 — `{ q: { active: boolean } }` (확장 대비 객체 wrap, 향후 `tier`/`expiresAt` 추가 가능)
- 시드: `{ q: { active: false } }` — **Q 미구독이 default**
- `hasQAccess()` getter — Q 사용권 보유 여부
- `setQAccess(active: boolean)` setter — in-memory mutation, 데모 시뮬레이션용

기존 `lib/mock/billing.ts`는 학부모 결제(플래너 결제) 플로우. Q 결제는 *별도 도메인*이라 분리 — 추후 Q 결제 mock 도입 시 본 파일이 자연 진입점.

### D4. BlockCard CTA 게이팅
**결정**: CTA 라벨·시각은 동일("시작"/"이어서")이지만 클릭 동작 분기:
- **Q 사용권 ON**: 기존 동작 (`<Link href={getFeatureRoute(slug)}>`)
- **OFF (미구독)**: `<button>`으로 toast 안내 — "🔒 풀림 Q 구독이 필요해요. Q를 구독하면 학습 블록을 바로 풀이로 진행할 수 있어요."
- duration 3500

### D5. BlockCompleteDialog "다음 블록 시작" 게이팅
**결정**: 같은 패턴. 미구독 시 toast + 모달 닫기. 다음 블록은 *플래너 안에서만* 자연 진행(시간 흐름).

### D5b. DayView "지금 시작" CTA 게이팅
**결정**: day-view.tsx 다음 블록 카드의 `<Link>` CTA도 동일 패턴 적용. 플래너 안 모든 *Q 진입점*에 일관 게이팅.

### D6. 잠금 톤 정리
**결정**: 두 게이팅은 별개:
- **기능 잠금** (`isLockedSlug`): 기능 자체 미출시 — Lock 아이콘 + "준비 중" + cursor-not-allowed
- **Q 미구독**: 기능은 출시되었으나 *결제 미완* — Lock 아이콘 + "구독 필요" 안내 toast
- 톤: 둘 다 "잠긴 상태"지만 미구독은 *해소 가능한 잠금*(결제로 풀림)
- 잠금 우선 — 락된 블록은 미구독 분기 무시

### D7. 시뮬레이션 토글 UI는 본 plan 제외
**결정**: 
- **실제 흐름**: Q 결제 페이지 → 결제 완료 → 자동으로 `q.active = true` (별도 plan, billing 도메인에서 다룸)
- **데모 시연**: dev 콘솔에서 `setQAccess(true)` 호출 가능. 또는 추후 me/settings 또는 me 페이지에 "🧪 데모용 Q 사용권 시뮬레이션" 토글 (별도 plan)
- 본 plan은 *데이터 모델 + 게이팅 분기*만

## 작업 범위
- **신규**: `src/lib/mock/subscriptions.ts`
- **수정**: `src/lib/mock/index.ts` (barrel 추가)
- **수정**: `src/components/planner/block-card.tsx` (full + compact CTA 게이팅)
- **수정**: `src/components/planner/block-complete-dialog.tsx` (next block CTA 게이팅)
- **수정**: `src/components/planner/views/day-view.tsx` ("지금 시작" CTA 게이팅)
- **수정**: `src/components/planner/week-grid.tsx` (셀 막대 세로화)

## 작업 항목

### A. mock — `lib/mock/subscriptions.ts` 신규
- [x] `DomainSubscriptions` 타입 — `{ q: { active: boolean } }`
- [x] `domainSubscriptions` 시드 — `{ q: { active: false } }`
- [x] `hasQAccess()` getter
- [x] `setQAccess(active: boolean)` in-memory setter
- [x] `lib/mock/index.ts` barrel에 export 추가 (`./integration-settings` → `./subscriptions`)

### B. BlockCard CTA 게이팅 — full + compact 양쪽
- [x] **`BlockCardFull`**: `hasQAccess() === false` + locked 아닐 때 `<button>` + `notifyQNoAccess()` toast
- [x] **`BlockCardCompact`**: 동일 패턴
- [x] toast 카피 "🔒 풀림 Q 구독이 필요해요" + "Q를 구독하면 학습 블록을 바로 풀이로 진행할 수 있어요." (duration 3500)
- [x] aria-label "풀림 Q 미구독 — 클릭하면 구독 안내가 떠요"

### C. BlockCompleteDialog 게이팅
- [x] `handleNext`에서 `nextBlock?.linkedFeatureSlug` 진입 직전 `hasQAccess()` 체크
- [x] 미구독 시: toast 안내 + 모달 닫기 (다음 블록은 시간 흐름으로 자연 진행)

### D. DayView "지금 시작" CTA 게이팅
- [x] day-view.tsx 다음 블록 카드 `<Link>` → `qAccess` ternary 분기
- [x] 미구독 시: `<button>` + 동일 toast 카피

### E. WeekGrid 셀 — 세로 막대
- [x] `Cell` 컴포넌트:
  - 셀 height `h-8` → `h-12`
  - 막대 wrapper: `relative` 유지
  - 막대 child: `absolute bottom-0 left-0 right-0` + `height: ${barPct}%` + `rounded-t`
  - 빈 셀: `h-12` + 옅은 배경 그대로

### F. 검증
- [x] `bunx tsc --noEmit` 통과
- [x] `bun run lint` — 우리 touched 파일 0 errors (기타 pre-existing 제외)
- [x] 라이브 200 OK — `/planner`, `/planner?view=week`, `/planner?view=day`
- [x] **세로 막대 캡처**: 1440×900에서 셀 h-12, 막대 bottom-anchored 확인 (`verify-week-vertical-bar.png`)
- [x] **Q 미구독 CTA**: "지금 시작" 버튼 클릭 → URL 변동 없음 + toast "🔒 풀림 Q 구독이 필요해요" 노출 확인
- [x] **사용권 시뮬**: `window.__pullim.setQAccess(true)` 후 client-side 탭 전환 → CTA 7개가 모두 `<a href="/q/infinity/solve">` Link로 전환 확인
- [x] 상태 복원 — `setQAccess(false)`

## 본 plan 제외 (후속)
- Q 결제 페이지 / 구독 결제 플로우 본구현 (billing 도메인 확장)
- 플랫폼 설정 페이지 / Q 사용권 시뮬레이션 토글 UI
- 다른 도메인 cross-link 게이팅 (라이브러리·클래스봇 등) — 사용권 모델 일관 적용 시 같은 패턴
- 미구독 toast의 "구독하기" 액션 버튼 (Q 결제 페이지 도착 후 추가)
- 통합 알림 시스템 (사용권 활성 시 사용자 안내 배너)

## 트레이드오프 메모
- **미구독 CTA가 dead-end로 보일 우려** — toast 안내만으론 부족. 향후 toast에 "Q 구독 페이지로 가기" 액션 버튼 추가 (Q 결제 페이지 본구현 후)
- **세로 막대로 cell 높이 증가** — 좌측 WeekGrid 약 30px 길어짐. 우측 align stretch로 자동 정합
- **subscription state가 module singleton** — 페이지 navigation 후에도 유지, SSR 새 진입 시 reset 가능. 데모 한계 수용
- **"플래너에서 Q 진입은 핵심 가치"라는 이전 분석과의 정합** — *통합 진입은 Q 구독자에게만 차별화 제공*으로 재정의. 비구독자는 결제 유도. BizModel relation: 플래너가 Q 결제로의 funnel 역할 → 도메인 cross-sell이 더 명확해짐
- **"연동 토글" 메타포 폐기** — 토글이라고 표현하면 사용자가 *임의로 연동 OFF* 상태로 보일 수 있음. 실제로는 *Q 미구독 상태가 default*이고 사용권 획득(=결제)으로 잠금 해소. 카피·UI 모두 "구독" 톤으로 통일
