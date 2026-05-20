# 2026-05-19 — SPEC sync + 플래너 도메인 시그니처 구현

## 목표

오늘 추가된 SPEC 갱신분을 코드에 반영한다.

- **08-design-system**: `warn-cta-bg #D97706` 신설, easing/layout 토큰 CSS·tokens 노출, slate-400 12px 메타 잔여 회수
- **07-branding § 4.5**: 플래너 카피 4원칙 (위협→권유, 평가어→관찰어 등) 실제 카피 적용
- **11-planner-design (신규)**: Quick Wins 4건 우선 — 5단 상태 색문법, D-day Tier, 컨디션/번아웃 분리, M1 현재시각 라인 모션

완료 기준: `bunx tsc --noEmit && bun run lint` 통과 + `bun dev` 라이브 dogfood (홈/리포트/캘린더) 시 시각 정합.

---

## 배경

- 2026-05-19 SPEC 갱신: [`proc/spec/00-index.md` 변경 이력 2026-05-19](../spec/00-index.md) 참조
- 권위 입력:
  - [input/design-system/private-planner.md](../../input/design-system/private-planner.md) — 8영역 + 8 모션
  - [input/planner/REPORT.md](../../input/planner/REPORT.md) — 1차 라이브 감사
  - [input/design-system/DESIGN_SYSTEM.md](../../input/design-system/DESIGN_SYSTEM.md) — 통합 토큰 v0.1
- 코드 인벤토리 (영향 영역):
  - `src/app/globals.css` — 토큰 정규 위치
  - `src/lib/tokens/index.ts` — 런타임 토큰
  - `src/components/planner/block-card.tsx` — 5단 상태 색문법
  - `src/components/planner/condition-burnout-panel.tsx` + `condition-slider.tsx` + `burnout-card.tsx` — 분리
  - `src/components/planner/today-timeline.tsx` + `side-timeline-24.tsx` + `week-grid.tsx` — 시간 그리드
  - `src/components/shell/app-header.tsx` — D-3 헤더 띠 + D-day 상시 칩
  - 슬레이트-400 사용 83 hits — 12px 메타 사용처만 회수

---

## 작업 항목

### Stage 1 — PR-A · PR-B 토큰 동기화 (S) ✅

- [x] `src/app/globals.css`에 `--color-pullim-warn-cta-bg: #D97706;` 추가 (warn-bg 옆)
- [x] `--color-pullim-success-strong: #0E8C56;` 추가 (흰글자 위 success 텍스트 안전 값)
- [x] easing 토큰 노출 (`--pullim-ease-standard`, `--pullim-ease-emphasis`, `--pullim-duration-fast/base/slow`)
- [x] layout 토큰 노출 (`--pullim-header-height-*`, `--pullim-sidebar-width-*`, `--pullim-tabbar-height`, `--pullim-content-maxwidth`, `--pullim-fab-offset-bottom`, `--pullim-viewport-safety-padding`)
- [x] `src/lib/tokens/index.ts`에 `pullimMotion` + `pullimLayout` 상수 추가, `pullimSemantic`에 `successStrong`/`warnCtaBg` 추가
- [x] 검증: `bunx tsc --noEmit` 통과, lint 신규 이슈 0건

### Stage 2 — slate-400 12px 메타 audit (S) ✅

- [x] `text-[9~11px]` + `text-pullim-slate-400` 위반 25건 회수 → slate-500로 교체
- [x] `text-xs` + slate-400 위반 6건 회수 (라이트 위 12px 메타는 slate-500이 AA 최소선)
- [x] `text-[9px]` 1건 (`burnout-card.tsx`) 10px로 함께 격상 — 9px 자체 SPEC 금지
- [x] `meta-row.tsx`는 dark/light 분기에서 dark만 slate-400 사용 — 룰 정합 (기존 정상)
- [x] disabled state slate-400 (`준비 중` 버튼 등)은 WCAG 예외로 유지
- [x] 잔여 위반 grep 0건 (lite 14px+ 한정 사용처만 잔존)
- [x] `bun run build` production 빌드 통과 (모든 라우트 생성, 에러 0건)

### Stage 3 — PR-C 플래너 카피 4원칙 적용 (S) ✅

- [x] "미수행" → "이월" 라벨 5곳 (block-card / today-reflection / side-timeline-24 / layouts/block-cards / family mock) 교체
- [x] mock title "(어제 누락분)" → "(어제 못한 25분)", reasoning "어제 누락분 이월" → "어제 못한 25분, 오늘로 이월했어요"
- [x] "위험 신호 — 휴식 권장" → "{요일}요일이 좀 빡빡했어요. 30분 쉬어볼까요?" (weekly-summary)
- [x] "컨디션 관리 필요해요" → tone 분기 (good: "컨디션 좋아요" / warn: "컨디션 살펴볼게요" / bad: "오늘은 쉬어가요")
- [x] "부모님께 보내기" → "부모님께 회고 공유" (reports page + consent dialog)
- [x] 명령형→청유형 CTA는 케이스별 — 짧은 버튼 라벨("지금 시작", "이어서")은 현 상태 유지 (UX 명확성 우선)
- [x] User-facing 위반 grep 0건 (코드 코멘트 1건만 잔존 — 코멘트 식별자 매핑용)

### Stage 4 — PR-D 5단 상태 색문법 (M) ✅

- [x] `getBlockVisual(status, isBreak)` 헬퍼 신설 — 5단(done/doing/todo/skipped/break) → stripe + surface + pattern
- [x] 카드·compact 양쪽 variant에 `absolute left 4px stripe` 적용
- [x] skipped는 `bg-pullim-warn-cta-bg` stripe + 135° 사선 빗금 패턴 (`repeating-linear-gradient`)
- [x] done은 `bg-pullim-success` stripe + `bg-pullim-success-bg/30` 면
- [x] doing은 brand-600 stripe + ring + shadow-pullim-md
- [x] todo는 stripe 없음 + hover border 효과
- [x] break (recovery)는 slate-100/60 면, stripe 없음
- [x] active 블록 우측에 **진행 wedge 텍스트** (`Math.round(progress * 100)%` 청색 mono) — Progress bar와 병기
- [x] skipped 라벨에 ⚠/Clock 아이콘 + "이월" 텍스트
- [x] 토큰 사용 — 인라인 헥스 0건 (사선 패턴 rgba 외)

> 시간 그리드 블록(today-timeline / side-timeline-24) 동일 색문법 적용은 별 plan 후보 (구조가 막대 형태라 stripe 패턴 적용 별도 설계 필요)

### Stage 5 — PR-D D-day Tier + D-3 헤더 띠 (S~M) ✅

- [x] `src/lib/planner/d-day-tier.ts` 신설 — `getDDayTier`, `tierChipClass`, `shouldShowDDayHeaderBand` export
- [x] Tier 6단계: `past | normal | attention | imminent | critical | today`
- [x] `DDayChip` 컴포넌트 신설 — Tier별 색 자동 매핑, critical은 `animate-pulse`, imminent+ 캘린더 아이콘
- [x] `DDayHeaderBand` 컴포넌트 신설 — `shouldShowDDayHeaderBand` true일 때 4px warn-cta-bg 띠 + 호버 툴팁 (권유형 카피)
- [x] `planner/page.tsx` 헤더 description의 ddayLabel 문자열을 `<DDayChip />` 컴포넌트로 교체 (day view + month view)
- [x] CalendarShell 직전에 `<DDayHeaderBand />` 노출
- [x] 미사용 `formatDday` / `ddayLabel` 정리

> 헤더 우측 상시 미니 칩(어디서든 D-day 가시)은 `AppHeader` 글로벌 영향이라 별 plan 후보로 분리

### Stage 6 — PR-D 컨디션 vs 번아웃 분리 (M) ✅

- [x] **SPEC 정합 발견·교정**: 코드 `todayBurnout.score`는 "안전도(높을수록 안전)" 시맨틱이고 SPEC 11 § 3 표는 반대로 적혀있어 정합 — 11/07 SPEC을 "안전도" 프레이밍으로 수정
- [x] 헤더 한 줄 → 두 칩 분리: `🙂 오늘 {label}` (slate-100 면) + `🔋 안전도 {score} · {label}` (배경+텍스트 tone별)
- [x] 안전도 색 문법: 70+ success / 50-69 warn / <50 danger (높을수록 안전)
- [x] 라벨 분기 (안전 / 주의 / 위험)
- [x] burnout-card 내부 eyebrow "번아웃 지수" → "번아웃 안전도" 정합

> 임계치 권유 배너 + 도넛 톤 조정은 별 plan 후보 (분리 자체로 가독성 회수가 우선 효과)

### Stage 7 — PR-D 시간 그리드 시그니처 (M·일부) ✅

- [x] **M1 현재 시각 라인** (`side-timeline-24.tsx`):
  - 빨간 가로선 채도 한 단계 ↓ (`border-pullim-danger/70`)
  - 좌측 알약 `● HH:MM 지금` 추가 (시간 라벨 컬럼에 살짝 돌출, 흰 글자 + 내부 dot)
  - 60초 간격 1px 부드러운 이동 (1000ms standard easing) — `motion-safe:transition-[top]` 사용으로 `prefers-reduced-motion` 자동 가드
- [x] today-timeline은 now-line 패턴 없음 — 적용 대상 외

> 시간대 그룹 가변 행 높이, 빈 슬롯 affordance, 충돌 표현 등은 본 plan 범위 외 (별 plan 후보)

### Stage 8 — 검증 + ship ✅ (정적 검증)

- [x] `bunx tsc --noEmit` — 통과
- [x] `bun run lint` — 변경 영역 신규 이슈 0건 (기존 22 problems는 본 작업 범위 밖: db/schema.ts `any`, input/design-prototype 등)
- [x] `bun run build` — production 모드 전체 라우트 생성 성공, 에러 0건
- [x] `bun dev` 부트 확인 (Ready in 227ms)
- [ ] **라이브 dogfood (사용자 확인 필요)**: 5단 상태 색문법·D-day Tier·컨디션/번아웃 분리·M1 라인·모바일 표면 시각 검증은 사용자가 직접 브라우저 확인
- [ ] PR 단위 분리 — dogfood 후 결정. 우선 stage 단위 커밋이 모여있는 상태로 단일 PR 또는 stage별 분리 검토

> 머지 후 archive 이동은 사용자 명시 시에만.

---

## 2차 라운드 — Stage 9~12 (사용자 명시 — "전체 4건 + 셸 작업")

### Stage 9 — 임계치 권유 배너 + 도넛 톤 (S) ✅

- [x] [`burnout-threshold-banner.tsx`](../../src/components/planner/burnout-threshold-banner.tsx) 신설 — 안전도 < 50일 때 warn-bg 배너, dismissible, 3 액션 (`블록 줄이기` / `그대로 가기` / `부모님께 공유`)
- [x] planner/page.tsx에서 `<DDayHeaderBand />` 다음에 노출
- [x] 도넛 두께 절반 (10px → 5px, 내부 원 60×60 → 70×70), 트랙 ring `slate-100 → slate-50`로 더 옅게
- [x] SPEC § 3.2 트리거 표현 정합 ("번아웃 70+" → "안전도 < 50")

### Stage 10 — violet/teal 토큰 + 블록 타입별 컨테이너 (M) ✅

- [x] [`globals.css`](../../src/app/globals.css)에 `--color-pullim-violet-50/600`, `--color-pullim-teal-50/600` 추가
- [x] [`tokens/index.ts`](../../src/lib/tokens/index.ts)에 `pullimViolet`/`pullimTeal` 상수 미러
- [x] [`block-card.tsx`](../../src/components/planner/block-card.tsx) `getTypeContainerClass` 헬퍼 신설 — 8 타입을 brand/violet/teal/warn/lemon/slate에 분산 매핑
- [x] 모의평가(mock) 아이콘 우상단 D-day 표시 dot (danger + card ring) — card·compact 양쪽
- [x] 본문 + compact variant 모두 적용

### Stage 11 — 주간 리포트 인사이트 카드 (M) ✅

- [x] [mock/planner.ts](../../src/lib/mock/planner.ts) `weeklyInsights` 신설 — `emoji`/`headline`/`action`/`tone` 시그니처 4건 (수학 정답률·화요일 학습 시간·금요일 부담 신호·17일 스트릭)
- [x] [`weekly-insights.tsx`](../../src/components/planner/reports/weekly-insights.tsx) 신설 — sm:grid-cols-2 카드 + tone별 색 + 액션 칩 (toast 디스패치)
- [x] `weekly-summary.tsx` 최상단에 슬롯 추가 (메트릭·차트보다 위)
- [x] 카피 톤 4원칙 준수 — 평가어 0건, 관찰어·권유형

### Stage 12 — AppHeader D-day 글로벌 미니 칩 (S, 셸 작업 — 사용자 명시 승인) ✅

- [x] [`app-header.tsx`](../../src/components/shell/app-header.tsx) 스트릭 칩 바로 옆에 `<DDayChip />` 노출 (sm 이상)
- [x] 클릭 시 `/planner` 이동 (어디 페이지에 있든 시험 일정 시야 안)
- [x] CLAUDE.md `§ 2` "셸 edit은 글로벌 작업으로 분리" 룰 — 사용자 명시 승인 후 진행

### 검증 (Stage 9~12) ✅

- [x] `bunx tsc --noEmit` 통과
- [x] `bun run build` production 빌드 14 라우트 전부 생성 성공
- [x] lint 신규 이슈 0건 (UserIcon 미사용 경고는 기존 코드 잔존)

---

## 여전히 범위 외 (별 plan 후보)

- 시간대 그룹 가변 행 높이 (점심/오후/저녁 코어 — 시간 그리드 구조 리팩터)
- 빈 슬롯 affordance + 회복/보강 추천
- 학습 블록 카드 점3개 메뉴 상태별 분기 + 정렬 토글
- 마법사형 온보딩 4단계 + 첫 블록 confetti
- 모션 M2~M8 (블록 완료 체크, 컨디션 햅틱, D-day chip 펼침, 시간대 sticky, 빈 슬롯 fade-in, 인사이트 stream-in, 스트릭 confetti)
- "오늘 어땠어요?" 회고 시점 자동 펼침
- 컨디션 시간대별 미니 라인 차트
- 충돌·겹침 표현 (선제 디자인)

위 항목은 [11-planner-design.md § 9 우선순위](../spec/11-planner-design.md#9-우선순위-quick-wins--strategic-bets) 참조하여 별 plan으로 추후 진행.

---

## 검증 자료

- 토큰 정합: `src/app/globals.css` ↔ `src/lib/tokens/index.ts` ↔ `08-design-system.md`
- 카피 회수: `grep -rn "미수행\|위험 신호\|컨디션 관리 필요\|어제 누락분"` 0건 (단, mock 외 라이브 카피 한정)
- 라이브 dogfood 캡처는 별도 `output/live-shots/` 갱신 (선택)
