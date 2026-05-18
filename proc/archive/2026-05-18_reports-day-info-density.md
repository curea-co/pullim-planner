# Audit #8 — reports day view 정보감 강화

## 목표
`/planner/reports` Day view (`TodayReflection`) 패널의 정보 밀도를 회고 페이지 수준으로 끌어올린다. dogfood 피드백 "비어 보임"의 원인인 spacing/padding/font 미시 부족을 정리해, **회고가 회고처럼 보이게** 한다. audit #5(timeline trim) / #6(데모 dead-end) / #7(builder min-h)에 이은 visual dead-space trim 패턴 연속.

## 배경
- audit Top #8 — 2026-05-15 A-1 후보 5건 중 잔여 4건에서 dogfood 근거 있는 1건 선정
- production dogfood(2026-05-14 reports F1~F7 prod, 2026-05-18 PR #13 Web Analytics 진입 이후) 피드백: reports day view 진입 시 "정보가 비어 보임"
- 원인은 콘텐츠 부재가 아니라 **시각적 공기 부족** — 카드 padding 좁고 섹션 헤더 약하고 메트릭 강조 미흡
- `TodayReflection`은 `reports/page.tsx:72`에서 `defaultOpen` 전달 시 펼친 상태로 진입 → 첫 인상이 곧 첫 시각 평가

## 작업 항목

### 1단계 — 갭 분석 (완료)

#### 1.1 컴포넌트 영역별 spacing/font 현재값

| 영역 | 위치 | 현재값 | 평가 |
|---|---|---|---|
| Body 컨테이너 | [today-reflection.tsx:111](src/components/planner/today-reflection.tsx#L111) | `space-y-4 border-t p-4` (gap 16, padding 16) | 섹션 헤더가 11px라 16px gap이 분리감 약함 |
| 메트릭 grid | [today-reflection.tsx:113](src/components/planner/today-reflection.tsx#L113) | `grid grid-cols-3 gap-2` (gap 8) | 3열 자체는 적정. gap이 카드 padding과 같아 카드가 작아 보임 |
| Metric 카드 | [today-reflection.tsx:210](src/components/planner/today-reflection.tsx#L210) | `bg-pullim-slate-50 rounded-lg p-2.5` (padding 10) | 🔴 회고 헤드라인 카드 padding으로는 좁음 — "비어 보임" 1순위 |
| Metric value | [today-reflection.tsx:217](src/components/planner/today-reflection.tsx#L217) | `mt-1 font-mono text-base font-bold` (16px) | 🟡 회고 페이지 헤드라인 강조 약함 |
| 블록 리스트 | [today-reflection.tsx:146](src/components/planner/today-reflection.tsx#L146) | `space-y-1` (gap 4) | 🟡 항목 간 분리 약함, 압축감 |
| 인사이트 리스트 | [today-reflection.tsx:158](src/components/planner/today-reflection.tsx#L158) | `space-y-1.5` (gap 6) | 적정 |
| 인사이트 항목 | [today-reflection.tsx:165-168](src/components/planner/today-reflection.tsx#L165-L168) | `p-2.5 text-xs leading-relaxed` (10/12) | 적정 (메트릭 카드와 동일 padding) |
| CTA | [today-reflection.tsx:179](src/components/planner/today-reflection.tsx#L179) | `flex flex-wrap gap-2 ... py-2.5 text-sm font-bold` | 적정 |

#### 1.2 "비어 보임" 결함 분포 (Top 3)

**🔴 결함 1 — 메트릭 카드 padding 좁음**
- `p-2.5` (10px) 회고 헤드라인 카드로는 부족. 인사이트 항목과 동일 padding이라 *위계가 약함*
- 위치: [today-reflection.tsx:210](src/components/planner/today-reflection.tsx#L210)

**🟡 결함 2 — Metric value font 약함**
- `text-base` (16px). 회고 페이지의 "오늘 학습 시간 5h 30m"이 16px → 헤드라인 인상 부족
- 위치: [today-reflection.tsx:217](src/components/planner/today-reflection.tsx#L217)

**🟡 결함 3 — 섹션 간 gap + 블록 리스트 압축**
- `space-y-4` body + `space-y-1` 블록 → 섹션 헤더(11px tracking-wider)가 시각 흐름 잠음
- 위치: [today-reflection.tsx:111](src/components/planner/today-reflection.tsx#L111), [today-reflection.tsx:146](src/components/planner/today-reflection.tsx#L146)

#### 1.3 부차 결함 (audit #8 범위 외)
- Body padding `p-4` (16px) — 모바일에서 좁지 않지만 spec 결정 필요 (별 audit)
- ribbon (collapsed) 영역 정보감 — 회고 페이지 진입 시는 펼침이라 우선순위 낮음

### 2단계 — fix 후보 3안 (G4 합의 완료 · 2026-05-18 · 채택: A spacing 미시조정)

#### 후보 비교

| # | 옵션 | Metric 카드 | Metric value | Body/리스트 gap | 변경 범위 |
|---|---|---|---|---|---|
| **A** | **spacing 미시조정 (추천)** | `p-2.5` → `p-3` (10→12) | `text-base` → `text-lg` (16→18) | body `space-y-4` → `space-y-5` (16→20), 블록 `space-y-1` → `space-y-1.5` (4→6) | className 4건 |
| **B** | **메트릭 강조 + border** | `p-3` + `border border-pullim-slate-200` | `text-lg` + accent tone 일관 적용 | A와 동일 | className 4건 + border 1건 |
| **C** | **정보 구조 재배치** | ribbon에 메트릭 통합, body는 블록+인사이트만 | 메트릭 항상 노출 | body 구조 변경 | 컴포넌트 분기 변경 |

#### 트레이드오프

| 기준 | A | B | C |
|---|---|---|---|
| dogfood "비어 보임" 해소 | 🟢 spacing/font 핵심 원인 해결 | 🟢 + 카드 시각 강화 | 🟢 구조 변경으로 다른 인상 |
| 회귀 위험 | 🟢 매우 낮음 (Tailwind 기본값) | 🟡 카드 border 일관성 영향 | 🔴 ribbon vs body 정보 중복/분기 회귀 |
| G4 합의 비용 | 🟢 작음 (룰: spacing 1단계 격상) | 🟡 중간 (border 도입 정당화 필요) | 🔴 큼 (구조 변경 합의) |
| 작업 시간 | ~15분 | ~25분 | ~60분 + 검증 |
| 미래 확장 비용 | 🟢 동일 spirit으로 다른 패널 재적용 가능 | 🟡 border 도입 시 다른 카드와 일관성 별도 결정 필요 | 🟡 ribbon 정보 표시 룰 재정의 |
| **추천도** | ★★★ | ★★ | ★ |

#### 추천 — **A (spacing 미시조정)**

- audit #5·#6·#7과 동일 spirit — *최소 변경으로 시각 일관성 회복*. 카드 강화나 구조 재배치는 별개 audit
- "비어 보임" 핵심 원인이 padding/font/gap에 분산 → A 4건 동시 격상으로 충분
- B의 border는 다른 카드(weekly-summary 메트릭, parent-report 등)와 일관성 별도 결정 필요 — audit #8 범위 초과
- C는 ribbon 정보 표시 룰 재정의 합의 필요 — 별 plan으로
- 구현 ~15분, 단일 PR로 마감 가능

후보 미정 시 **A** 기본으로 진행 — 풀스택 위임.

### 3단계 — 구현 (후보 합의 후, A 기준)

- [ ] `today-reflection.tsx:210` Metric 카드 `p-2.5` → `p-3`
- [ ] `today-reflection.tsx:217` Metric value `text-base` → `text-lg`
- [ ] `today-reflection.tsx:111` body `space-y-4` → `space-y-5`
- [ ] `today-reflection.tsx:146` 블록 리스트 `space-y-1` → `space-y-1.5`
- [ ] 인사이트 영역은 변경 없음 (이미 적정)
- [ ] reports day view 외 사용처 spot check — TodayReflection는 home day view에서도 사용 (`defaultOpen` 미지정). spacing 변경이 home에도 동일 적용되는데 home에서도 일관 개선이라 OK

### 4단계 — 검증 & 머지

- [ ] `bunx tsc --noEmit && bun run lint`
- [ ] mobile(375) + desktop(1440) × 2 라우트(/planner reports day / /planner home day) 캡처 — Before/After
- [ ] ribbon collapsed 상태도 회귀 없음 시각 확인
- [ ] BlockCompleteDialog "오늘 학습 마감" CTA anchor scroll(`id="today-reflection"`) 정상 동작
- [ ] PR (#15 예상) → main 머지
- [ ] production 반영은 배포 정책([proc/archive/2026-05-18_deploy-policy.md](../archive/2026-05-18_deploy-policy.md)) 기준 PM 명시 슬롯에서

## 후속 (별개)
- weekly-summary mobile 메트릭 그리드 (audit #1 후보 #1, 35~60m) — spacing 룰 재적용 후 별 audit
- 카드 border 도입 일관성 (B안 spirit) — 다른 카드와 묶어 별 plan
- ribbon 메트릭 통합 (C안 spirit) — ribbon 정보 표시 룰 재정의 별 plan

## 참고
- 어제 pattern template: [proc/archive/2026-05-18_builder-min-h.md](../archive/2026-05-18_builder-min-h.md) (audit #7, 4단계 구조)
- 핵심 파일: [src/components/planner/today-reflection.tsx](src/components/planner/today-reflection.tsx)
- 사용처: [src/app/(student)/planner/reports/page.tsx:72](src/app/(student)/planner/reports/page.tsx#L72), home day view
- 배포 정책: [proc/archive/2026-05-18_deploy-policy.md](../archive/2026-05-18_deploy-policy.md)
