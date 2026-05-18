# Audit #7 — builder min-h 일관성 정리

## 목표
플래너 builder(시간표 신규 작성 / 시간표 수정 / onboarding) 5 layout에서 step container와 자식 카드 간 `min-h` 불일치를 정리해 빈 상태에서도 시각적 정합성을 유지한다. audit #5(timeline trim) / #6(데모 dead-end)에 이은 functional·visual dead-space trim 패턴 연속.

## 배경
- audit Top #7 — 2026-05-15 A-1 후보 5건(weekly-summary mobile / **builder min-h** / 카드 컬러 / onboarding redirect / reports day 정보감) 중 1건
- timeline trim 인접 + 작업량 적음 + G4 합의 비용 적음 → daily_outcome 09:30 약속에서 사전 선정
- 빌더 컨테이너는 step별 `min-h-[280px]` 표준이나 자식 일부가 `min-h-[150px]` 또는 미지정 → 빈 상태에서 카드·메시지 vertical misalignment
- audit #6와 동일 4단계 구조 (1단계 갭 분석 매트릭스 / 2단계 fix 후보 3안 / 3단계 풀스택 / 4단계 검증)

## 작업 항목

### 1단계 — 갭 분석 (완료)

#### 1.1 컴포넌트별 min-height 현황 매트릭스

| 파일 | 컴포넌트 | 현재 min-height | 용도 | 비고 |
|---|---|---|---|---|
| `step-content.tsx:617` | AddSubjectCard | `min-h-[150px]` | Step 3 "과목 추가" 카드 | grid-cols-1/2에서 클릭 affordance 확보 |
| `step-content.tsx` | SubjectCard | 없음 (h-full) | Step 3 과목 카드 | 부모 높이 상속 |
| `step-content.tsx:1039-1044` | Step 8 preview section | 없음 (text-center만) | Step 8 일주일 미리보기 | 부모 `min-h-[280px]`만 의존 |
| `unit-editor-modal.tsx:184` | DialogContent | `max-h-[85vh]` (min 없음) | 단원 편집 모달 | flex-1 overflow-y-auto |
| `step-indicator.tsx` | nav element | 없음 | 단계 진행 표시 | grid 레이아웃, py-3 패딩만 |

#### 1.2 사용처별 wrapper 높이 표

| 경로 | 페이지 | Step Container | 부모 Section | AppShell |
|---|---|---|---|---|
| `/planner/manage/new` | 신규 시간표 작성 | `min-h-[280px]` | `p-5 lg:p-6` (높이 제약 없음) | flex-1 overflow-y-auto + pb-24/10 |
| `/planner/manage/[id]/edit` | 시간표 수정 | `min-h-[280px]` | 동일 | 동일 |
| `/planner/onboarding` | 온보딩 | (확인 필요) | OnboardingTemplate | 동일 |

#### 1.3 일관성 불일치 지점 (Top 2)

**🔴 결함 1 — Step 3 AddSubjectCard 150px vs 부모 280px 갭**
- AddSubjectCard만 `min-h-[150px]`, SubjectCard는 h-full → 과목 1~2개 추가 시 grid 내 카드 높이 시각적 불균형
- 위치: [src/components/planner-builder/step-content.tsx:617](src/components/planner-builder/step-content.tsx#L617)

**🟡 결함 2 — Step 8 Preview empty state 수직 정렬 미처리**
- "3단계에서 과목·단원을 추가하면 일주일 미리보기가 자동 생성돼요" 메시지가 280px 컨테이너 상단에 수풀려 있음
- 부모 `text-center`만 있고 flex justify-center 미적용 → empty 상태에서 의도하지 않은 white space
- 위치: [src/components/planner-builder/step-content.tsx:1039-1044](src/components/planner-builder/step-content.tsx#L1039-L1044)

#### 1.4 부차 결함 (참고)
- Step 3 단원 0개 placeholder: border-dashed button — 이미 OK
- Step 5 약점 0개: plain `<li>` 텍스트, 시각 강조 부족 (이번 audit 범위 외)
- Modal body: max-h만 있고 min-h 없음 — 단원 짧을 때 빈 scroll 영역 (이번 범위 외, 후속 별 plan)

### 2단계 — fix 후보 3안 (G4 합의 완료 · 2026-05-18 · 채택: A 부모 기준 통일)

#### 후보 비교

| # | 옵션 | Step 3 처리 | Step 8 처리 | 정합성 방향 |
|---|---|---|---|---|
| **A** | **부모 기준 통일 (추천)** | AddSubjectCard `min-h-[150px]` → 부모와 동일한 흐름으로 두되 SubjectCard에도 `min-h-[150px]` 통일 적용 | `<section>`에 `flex flex-col items-center justify-center min-h-[120px]` 추가 | 컨테이너 표준에 자식을 정렬 |
| **B** | **자식 기준 통일** | AddSubjectCard 그대로 유지하고 SubjectCard에 `min-h-[150px]` 명시 → grid 카드만 정렬 | 동일 (Step 8 flex 중앙) | 자식 기준 grid 정렬 (부모는 자유) |
| **C** | **구조적 재설계** | step container를 `grid grid-rows-[auto_1fr]` 도입해 카드가 부모를 채우게 → 모든 min-h 제거 | 동일 grid 구조로 빈 상태도 자동 중앙 | 구조 단위 재설계 |

#### 트레이드오프

| 기준 | A | B | C |
|---|---|---|---|
| 일관성 향상 | 🟢 매트릭스 표준값 1개로 수렴 | 🟡 grid만 정렬, 컨테이너는 그대로 | 🟢 구조적 정합 |
| 구현 복잡도 | 🟢 최소 (className 2건) | 🟢 작음 (className 1건) | 🔴 step-content.tsx 다수 영역 + 회귀 위험 |
| 회귀 위험 | 🟢 낮음 (추가만, 기존 미파괴) | 🟢 낮음 | 🔴 5 layout 전수 회귀 검증 필요 |
| G4 합의 비용 | 🟢 작음 (룰 1개) | 🟡 중간 (왜 AddSubjectCard 예외인지 설명 필요) | 🔴 큼 (구조 변경 합의) |
| 미래 확장 비용 | 🟢 새 카드 추가 시 동일 min-h 적용 룰 | 🟡 카드별 개별 결정 필요 | 🟢 grid가 알아서 처리 |
| 예상 작업 시간 | ~15분 | ~10분 | ~60분 + 검증 |
| **추천도** | ★★★ | ★★ | ★ |

#### 추천 — **A (부모 기준 통일)**

- audit #5·#6와 동일 spirit — *최소 변경으로 시각 일관성만 회복*. 구조 재설계는 별개 audit으로 분리
- A는 "step container 표준은 부모 min-h, 자식은 동일 min-h 또는 자동 stretch" 1줄 룰로 수렴 → 미래 카드 추가 시 결정 비용 0
- B는 AddSubjectCard 예외가 그대로 남아 룰 단순화 효과 없음
- C는 작업량과 회귀 검증 비용이 audit #7 범위를 초과 — 별 plan 후보
- 구현 ~15분, 단일 PR로 마감 가능

후보 미정 시 **A** 기본으로 진행 — 풀스택 위임.

### 3단계 — 구현 (후보 합의 후, A 기준)

- [ ] `step-content.tsx` Step 3 SubjectCard에 `min-h-[150px]` 추가 — AddSubjectCard와 정렬
- [ ] `step-content.tsx` Step 8 preview `<section>`에 `flex flex-col items-center justify-center min-h-[120px]` 추가 — empty 메시지 vertical 중앙
- [ ] onboarding builder 사용처 회귀 spot check (확인 필요 표 항목)
- [ ] 카드 높이 변경이 grid-cols-1(모바일) / grid-cols-2(데스크탑) 둘 다에서 일관 적용되는지 캡처

### 4단계 — 검증 & 머지

- [ ] `bunx tsc --noEmit && bun run lint`
- [ ] mobile(375) + desktop(1440) × 3 사용처(new / edit / onboarding) × Step 3(과목 0/1/2개) + Step 8(empty / filled) 캡처 매트릭스
- [ ] Step indicator·modal 회귀 없음 확인
- [ ] PR (#14 예상) → main 머지
- [ ] production 반영은 배포 정책(`proc/knowhow/2026-05-18_deploy-policy.md`) 기준 PM 명시 슬롯에서
- [ ] (사용자 명시 시) plan archive 이동

## 후속 (별개)
- Step 5 약점 0개 empty state 시각 강조 — 별 audit
- Unit Editor Modal min-h 처리 — 별 audit
- step container `grid-rows-[auto_1fr]` 구조 재설계 (옵션 C) — 별 plan, 장기

## 참고
- 어제 pattern template: [proc/plan/2026-05-15_demo-deadend-cleanup.md](2026-05-15_demo-deadend-cleanup.md) (audit #6, 4단계 구조)
- 핵심 파일: [src/components/planner-builder/step-content.tsx](src/components/planner-builder/step-content.tsx), [src/components/planner-builder/unit-editor-modal.tsx](src/components/planner-builder/unit-editor-modal.tsx)
- 배포 정책: [proc/knowhow/2026-05-18_deploy-policy.md](../knowhow/2026-05-18_deploy-policy.md)
