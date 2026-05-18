# Audit #6 — 데모 dead-end 버튼 정리

## 목표
`/planner` 홈에서 클릭해도 "데모/준비 중" 토스트만 띄우는 버튼을 시각적으로 disabled 또는 hidden으로 정리해 functional dead-space를 제거한다. 어제 #5(visual dead-space trim)와 동일한 spirit — 클릭 affordance와 실제 기능이 일치하지 않는 곳을 도려낸다.

## 배경
- audit Top #6 (어제 #5 archive 직후) — 신규 발굴 후보
- `/planner` 페이지의 모든 view(day/week/month)에서 **3개 버튼이 클릭해도 토스트만 띄움**:
  - `이전 ${unit}` (prev) → `toast.info("⬅️ 이전 ${unit}", "데모 단계는 이번 주 데이터만 채워져 있어요...")`
  - `다음 ${unit}` (next) → `toast.info("➡️ 다음 ${unit}", "데모 단계는 이번 주 데이터만 채워져 있어요.")`
  - `순서 변경` (day-view 우측) → `toast.info("🛠️ 블록 순서 변경 — 준비 중", "드래그 정렬은 곧 열려요...")`
- 정상 클릭 가능해 보이지만(opacity 100, hover) 클릭하면 페이지·데이터 변화 0. 매번 동일 토스트만 노출 → "왜 안 움직이지?"
- 어제 #5는 visual dead space(timeline 빈 셀)를 trim. 본 #6은 functional dead space(작동 안 하는 버튼)를 trim — 동일 패턴
- `CalendarShell`은 이미 `disabled={!onPrev}` 처리 로직 보유([src/components/planner/calendar-shell.tsx:78](src/components/planner/calendar-shell.tsx#L78)) → onPrev/onNext 미전달만 해도 disabled UI로 전환. 즉 fix는 페이지 레벨에서 핸들러만 끊으면 됨

## 작업 항목

### 1단계 — 갭 분석 (완료)

#### 1.1 dead-end 버튼 × 영향 매트릭스

| # | 버튼 | 위치 | 현재 클릭 시 동작 | 노출 빈도 | 시각 affordance | 영향 |
|---|---|---|---|---|---|---|
| **a** | `이전 ${unit}` (prev) | `CalendarShell` 헤더 우측, `/planner` 전 view | toast.info "데모 단계는 이번 주 데이터만…" | 🔥 첫 진입 즉시 노출, day/week/month 모두 | 정상 버튼 (hover bg, 활성 styling) | High — default 페이지·default view |
| **b** | `다음 ${unit}` (next) | 위와 동일 우측, 화살표 반대 | toast.info "데모 단계는 이번 주 데이터만…" | 🔥 위와 동일 | 정상 버튼 | High |
| **c** | `순서 변경 →` | `/planner?view=day` 우측 SectionHeading action | toast.info "🛠️ 블록 순서 변경 — 준비 중…" | 🟡 day-view 한정 (default view) | text link 스타일 (text-pullim-blue-600) | Mid — default view지만 부가 액션 |
| (참고) | `Promote to Production` Vercel | (외부) | n/a | (제외 — 운영 절차) | n/a | n/a |

**결론**: 3개 모두 동일 패턴(클릭→toast.info, 데이터 변화 0). fix는 `/planner` page와 day-view 두 곳에서만.

#### 1.2 호출부 정확 좌표
- prev/next: [src/app/(student)/planner/page.tsx:50-62](src/app/(student)/planner/page.tsx#L50-L62) — `onPrev`/`onNext` 핸들러
- prev/next prop 전달: [src/app/(student)/planner/page.tsx:139-140](src/app/(student)/planner/page.tsx#L139-L140) — `onPrev={onPrev} onNext={onNext}`
- CalendarShell disabled 로직: [src/components/planner/calendar-shell.tsx:75-95](src/components/planner/calendar-shell.tsx#L75-L95) — 이미 `disabled={!onPrev}` 분기 + `disabled:opacity-40 disabled:cursor-not-allowed` styling 존재
- 순서 변경: [src/components/planner/views/day-view.tsx:65-69](src/components/planner/views/day-view.tsx#L65-L69) — `onReorder` 핸들러 / [day-view.tsx:175-186](src/components/planner/views/day-view.tsx#L175-L186) — SectionHeading action 버튼

#### 1.3 데모 안내가 다른 경로로도 노출되는가
- 헤더 `description`은 "지난 ${unit}" 같은 안내 없음 — navLabel `2026.04.24 (목)` 만 정적
- 어제 #5처럼 정보 손실 없는 시각 정리 가능 (사용자가 데모 한계를 토스트로 안 봐도 무방)
- `이번 주 데이터만 채워져 있어요` 같은 정보를 보존하려면 navLabel 옆 작은 `(데모)` chip 또는 PageHeader description에 한 줄 추가

### 2단계 — fix 후보 3안 (G4 합의 대기)

#### 후보 비교

| # | 옵션 | prev/next 처리 | 순서 변경 처리 | 데모 안내 보존 |
|---|---|---|---|---|
| **A** | **prop 미전달 + 버튼 hide** | `/planner`에서 `onPrev/onNext` prop 자체 미전달 → CalendarShell이 자동 disabled, 추가로 disabled 시 버튼 visually hidden 옵션 검토 | day-view 우측 `순서 변경` action 자체 미렌더 | 없음 (가장 깔끔, 노이즈 0) |
| **B** | **disabled + 사유 chip** | `onPrev/onNext` 미전달 → disabled. navLabel 옆 `(데모)` chip 한 번 표시 | `순서 변경 →` 버튼을 `<span>드래그 정렬 곧 열려요</span>` 정적 라벨로 변환 | navLabel 옆 chip + day-view 라벨로 인라인 보존 |
| **C** | **disabled + 첫 진입 1회 토스트** | disabled 처리 + 페이지 mount 시 1회만 `toast.info` (sessionStorage flag로 중복 차단) | 동일 1회 토스트 패턴 | 토스트로 1회만, 클릭 무한 반복 차단 |

#### 트레이드오프

| 기준 | A | B | C |
|---|---|---|---|
| 노이즈 제거 | 🟢 완전 제거 | 🟡 chip 1개·라벨 1개 추가 | 🟡 1회 토스트 (이후 0) |
| 데모 한계 정보 전달 | 🔴 없음 (사용자 추측) | 🟢 inline chip/라벨로 영구 가시 | 🟡 1회 노출 후 사라짐 |
| 구현 복잡도 | 🟢 최소 (prop 제거 + JSX 1줄 제거) | 🟢 작음 (chip 컴포넌트 1개 추가, 정적 span) | 🟡 sessionStorage 또는 ref 플래그 처리 필요 |
| 미래 wire-up 시 회복 비용 | 🟢 prop·핸들러 재추가만 | 🟡 chip·라벨 제거 + prop 재추가 | 🟡 토스트 로직 제거 + prop 재추가 |
| 모바일 인식 | 🟢 버튼 자체가 없어 인지 부담 0 | 🟢 chip이 시각적으로 명확 | 🔴 토스트 dismiss 후 disabled 버튼만 남음 — 사유 모호 |
| **추천도** | ★★ | ★★★ | ★ |

#### 추천 — **B (disabled + 사유 chip)**

- 어제 #5는 `핵심 시간만`↔`전체 24h` 토글로 *정보를 숨기되 복귀 가능*하게 했다. 본 #6도 동일 정신 — *기능을 숨기지 않고 한계만 명시*
- A는 가장 깔끔하지만 "왜 안 움직이지?"가 그대로 남는다. 데모 컨텍스트에서 *왜* 비활성인지 명시는 호의적 UX
- C는 토스트가 첫 진입만 1회라 일관성 깨짐 (재방문 사용자는 사유 모름)
- 구현 ~20분, 단일 PR로 마감 가능

후보 미정 시 **B** 기본으로 진행 — 풀스택 위임.

### 3단계 — 구현 (후보 합의 후, B 기준)

- [ ] `/planner/page.tsx`의 `onPrev`/`onNext` 핸들러 + 라우트 사용처 모두 제거 → CalendarShell에 prop 미전달 (자동 disabled)
- [ ] `CalendarShell`의 navLabel 영역에 `<span class="text-pullim-slate-400 text-[10px]">(데모)</span>` chip 추가. prop으로 `demoChip?: boolean` 분리 또는 prev/next 모두 미전달 시 자동 노출
- [ ] `day-view.tsx`의 `onReorder` 핸들러 제거 + SectionHeading action을 `<span class="text-pullim-slate-400 text-xs">드래그 정렬은 곧 열려요</span>`로 변환 (클릭 없음, 시각만 hint)
- [ ] mock 안내 toast 잔존 여부 확인 (다른 비슷한 dead-end가 있다면 별 plan)
- [ ] (선택) `eslint`로 `toast.info(.*준비 중|데모 단계)` 패턴 잔존 grep — 같은 패턴 후속 청소

### 4단계 — 검증 & 머지

- [ ] `bunx tsc --noEmit && bun run lint`
- [ ] mobile(375) + desktop(1440) × 3 view(day/week/month) 캡처 — prev/next 버튼 disabled + (데모) chip 확인
- [ ] day-view "순서 변경" 영역 정적 라벨 시각 확인 (block 카드 list 헤더 흔들림 없음)
- [ ] reports/manage 페이지 회귀 없음 (CalendarShell은 `/planner` 전용)
- [ ] PR (#12 예상) → main 머지 → `vercel --prod --yes` 수동 promote (배포 정책)
- [ ] (사용자 명시 시) plan archive 이동

## 후속 (별개)
- 미래 시간 이동(prev/next) 실제 wire-up 시 mock 다주차 데이터 보강 plan 별도
- 드래그 정렬 실제 구현 plan 별도 (mock reorder API + dnd-kit)
- 같은 dead-end 패턴이 빌더·매니지에 있는지 후속 audit 후보

## 참고
- 어제 patten template: `proc/plan/2026-05-14_timeline-empty-trim.md` (audit #5, 4단계 구조)
- 핵심 파일: [src/app/(student)/planner/page.tsx](src/app/(student)/planner/page.tsx), [src/components/planner/calendar-shell.tsx](src/components/planner/calendar-shell.tsx), [src/components/planner/views/day-view.tsx](src/components/planner/views/day-view.tsx)
- 이미 disabled UI 지원: CalendarShell `disabled:opacity-40 disabled:cursor-not-allowed`
