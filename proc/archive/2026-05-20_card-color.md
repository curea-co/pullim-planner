# 2026-05-20 — audit #12 카드 컬러 (tone↔의미 매핑 명문화)

## 목표

audit #10 "카드 컬러"(2026-05-19 작성)는 weekly insight surface 2개를 1개로 줄여 **카드 컬러 다양성 5종 → 2종으로 회수**하는 surgical 우회로 처리됨([proc/plan/2026-05-19_card-color.md](2026-05-19_card-color.md) → PR #21). "전역 시각 결정" 부담을 surface 수 감소로 피한 결정.

본 plan은 audit #12로 카드 컬러 본 결정 재진입. 5월 15일 A-1 후보 중 남은 "카드 컬러"가 audit #10에서 weekly insight surface 통합으로 갈렸으니 audit #12에서 진짜 색 의미 결정.

**audit #10 회수 후 잔존 문제**: 카드 컬러 *다양성*은 줄었지만 카드 컬러 *의미 일관성*은 그대로. 같은 tone이 여러 의미로 분산.

본 plan은 09:30 약속 1·2단계만(갭 분석 + fix 후보 3안 + 추천). 3·4단계는 G4 합의 후 — plan 안에 **"후보 미정 시 추천 안으로 진행" 룰** 명시.

완료 기준 (1·2단계):
- tone↔의미 매핑 매트릭스 작성 (현재 사용처 grep 기반 7 tone × N 의미)
- fix 후보 3안(명문화·spot 통일·semantic 토큰) + 트레이드오프 + 추천 안 1건
- G4 합의 응답 없어도 추천 안 진행

---

## 배경

- **2026-05-15 A-1 후보 5건 중 1건**: weekly-summary mobile / builder min-h / **카드 컬러** / onboarding redirect / reports day 정보감
- audit #7 builder min-h(2026-05-18 PR #14), #8 reports day(PR #15), #9 mobile UI(#16), #10 weekly insight(2026-05-19 PR #21), #11 onboarding(PR #22) — 5건 중 4건 처리, 카드 컬러만 우회 처리됨
- 어제 plan에서 surgical 회수로 다양성 압축했으나 의미 분산은 그대로 → audit #12로 다시 진입

---

## 1단계 — 갭 분석 매트릭스

### 1.1 tone↔의미 매트릭스 (현 사용처 grep 기반)

| tone (Tailwind) | 사용처 의미 | 위치 | 충돌 |
|---|---|---|---|
| `bg-pullim-blue-50` | **선택 상태** (active) | planner-card:64, decorate-section:290·329·392·458, today-timeline doing:62, app-sidebar:100 | — |
| `bg-pullim-blue-50` | **info 헤드라인** (감탄·안내) | today-reflection sparkle:19·76, flywheel-note:15, app-header label:50, onboarding-template:121·160 | ⚠️ 선택 상태와 동일 색 |
| `bg-pullim-blue-50` | **시간 칩** (mono number) | side-timeline-24:159 | ⚠️ info와 동일 색 |
| `bg-pullim-blue-50` | **pedagogy 칩** (보조 메타) | pedagogy-tag:28·43·61 | ⚠️ info와 동일 색 |
| `bg-pullim-blue-50` | **empty state icon halo** | planner-manage/empty-state:10 | ⚠️ info와 동일 색 |
| `bg-pullim-success-bg` | **완료/긍정** (done badge, good condition) | block-card:27·54, today-reflection:20·98·229, condition-burnout-panel:63, weekly-goals-card:16, layouts/block-cards:97, parent-report-card:39 | — (일관) |
| `bg-pullim-warn-bg` | **이월/skipped 표면** | today-timeline:64, block-card:30·99, today-reflection:21·232, condition-burnout-panel:64, delete-confirm-dialog:42 | — |
| `bg-pullim-warn-cta-bg` | **강조선/텍스트 강조** | d-day-header-band:27 (1px band), block-card:65 (stripe), condition-burnout text:64 | ⚠️ "warn"인데 표면 아닌 강조 — 이름 vs 역할 모호 |
| `bg-pullim-danger-bg` | **위험 표면** | condition-burnout-panel:65, planner-builder step-content:579 hover | — |
| `bg-pullim-danger/10` | **위험 표면 (alt)** | monthly-progress-card:97, monthly-summary:84, planner-builder:1099 aside | ⚠️ danger-bg와 동일 의미 다른 표기 |
| `bg-pullim-lemon` | **번아웃 CTA 강조** (특수) | burnout-card:114·158·221, condition-burnout 휴식 권유 | — (도메인 한정) |
| `bg-pullim-slate-50` ~ `100` | **비활성/대기/배경** | 광범위 (검색 결과 50건+) | — (의미 정합) |

### 1.2 충돌 요약

| 충돌 유형 | 영향 |
|---|---|
| **같은 색 4종 의미** (blue-50) | 선택 상태 vs info vs 시간 칩 vs pedagogy 칩 — 시각 위계 흐림. "이게 클릭되나?" 모호 |
| **이름 vs 역할 불일치** (warn-cta-bg) | "warn cta 배경" 이름인데 실제 사용은 1px 스트라이프·텍스트 강조 |
| **표기 분산** (danger-bg vs danger/10) | 같은 의미를 두 표기로 — 후속 grep·정합 검증 비용 증가 |

### 1.3 audit #10 회수 효과 vs 본 audit #12 잔존

- audit #10 회수: weekly-summary 페이지 한정, ribbon 3톤(blue-50/success-bg/warn-bg) 제거. 페이지 단위 surgical
- audit #12 잔존: blue-50 4중 의미 + warn-cta-bg 명명 + danger 표기 2종 — **컴포넌트 전반의 의미 분산** (페이지 단위 해소 불가)

---

## 2단계 — fix 후보 3안

### 후보 A — tone↔의미 매핑 명문화 (knowhow 문서) ⭐ 추천

**범위**: `proc/knowhow/2026-05-20_tone-semantics.md` 신규. §1.1 매트릭스를 기준 표로 승격 + 권장 사용처 1:1 명시 + 후속 spot 정정의 기준 문서.

**구조**:
```
proc/knowhow/2026-05-20_tone-semantics.md
  §1. tone 권장 의미 (7 tone × 단일 의미)
  §2. 현 사용처 grep 매트릭스 (실태)
  §3. 권장 vs 실태 갭 (정정 대상 리스트)
  §4. 후속 spot 정정 우선순위 (#12-1, #12-2 ... subcoded)
```

**트레이드오프**:
- ✅ G4 합의 비용 가장 낮음 (코드 변경 0)
- ✅ 후속 spot 정정의 권위 입력 — audit #12-N으로 분할 가능
- ✅ 5월 15일 "전역 시각 결정" 부담이 큰 본 audit에 맞는 회수 방식 — 결정 자체를 명문화로 분리
- ❌ 시각 변화 0 — 의미 분산은 그대로
- ❌ 문서만으로 끝나면 후속 정정 안 일어날 위험 → §4 우선순위로 audit #12-N 트리거 명시로 완화

### 후보 B — surgical 통일 (코드 spot 정정)

**범위**: A안 + 코드 정정 spot 3건
1. `bg-pullim-blue-50`의 "시간 칩"·"pedagogy 칩"·"empty halo"는 `bg-pullim-slate-50/100`으로 neutral 변경 (선택 상태·info만 blue-50 유지)
2. `bg-pullim-warn-cta-bg` 사용처를 `bg-pullim-warn` 또는 `border-pullim-warn`로 정정 (표면이 아니므로)
3. `bg-pullim-danger/10`을 `bg-pullim-danger-bg`로 일괄 통일 (또는 반대) — 단일 표기

**트레이드오프**:
- ✅ 의미 분산 실제 해소
- ❌ G4 합의 비용 큼 — pedagogy 칩 색 변경은 "보조 메타도 정보다" 같은 반론 가능
- ❌ 회귀 위험 — 시각 칩이 너무 plain해지면 정보 위계 약화
- ❌ PR 사이즈 큼 (10+ 파일 spot 정정)

### 후보 C — semantic 토큰 도입 (CSS 변수 + Tailwind 별칭)

**범위**: A안 + B안 + 추상화
- `--surface-info`, `--surface-success`, `--surface-warn`, `--surface-danger`, `--surface-neutral`, `--surface-selected` CSS 변수
- Tailwind: `bg-surface-info` 같은 별칭
- 전 컴포넌트 일괄 grep·교체

**트레이드오프**:
- ✅ 의미↔색 1:1 강제 (코드 차원 락인)
- ✅ 다크모드·테마 확장 시 단일 변경점
- ❌ 거대 작업 (전 컴포넌트 50+ 라인 정정, PR 사이즈 최대)
- ❌ 본 audit #12 단일 슬롯 부적합 — 별 audit으로 분리 권장
- ❌ shadcn/ui 프리미티브와의 상호 영향 검토 비용

### 후보 비교 표

| 항목 | A안 (명문화) | B안 (spot 통일) | C안 (semantic 토큰) |
|---|---|---|---|
| 산출물 | knowhow 1 파일 | knowhow + 코드 10+ 파일 | knowhow + 토큰 + 코드 50+ 파일 |
| G4 합의 비용 | 낮음 (문서만) | 중간 (개별 색 결정) | 큼 (전역 추상화) |
| 시각 변화 | 0 | 부분 | 광범위 |
| 의미 분산 해소 | 0 (문서 권위만) | 부분 | 강제 |
| 후속 spot 분할성 | ✅ #12-N 트리거 | △ 1회로 끝남 | ❌ 1 거대 PR |
| 본 audit 적합 | ✅ | △ | ❌ |

### 추천 안 — A안

**이유**:
1. 어제 audit #10 패턴: 본 audit의 "전역 결정" 부담을 surgical 회수로 우회 → 본 audit도 결정 자체를 **명문화로 분리**하는 게 일관
2. G4 합의 비용 최저 — 명문화는 PM 단독으로 1차 작성, G4는 권장 의미 매트릭스 합의만
3. §4 후속 우선순위 명시로 audit #12-1·#12-2 같은 sub-audit 트리거 → spot 정정이 자연 진행
4. 5월 15일 A-1 후보 평가 시 "카드 컬러"가 거대 작업으로 분류된 이유가 정공법 시도 시 거대 PR — A안은 그 거대성을 작업으로 변환 가능한 단위(매트릭스)로 분해

**후보 미정 시 추천 안으로 진행** (09:30 약속 명시 룰).

---

## 3단계 — 풀스택 구현 (G4 합의 후 또는 추천 A안 진행)

> 1·2단계만 09:30 약속. 3단계 이하는 G4 합의 결과 또는 추천 A안으로 진행.

A안 진행 시 작업 목록:

- [ ] `proc/knowhow/2026-05-20_tone-semantics.md` 신규 작성
- [ ] §1 권장 의미: 7 tone × 단일 의미 표 (blue-50=선택 상태 / blue-100=신호 강조 / success-bg=완료·긍정 / warn-bg=이월·skipped 표면 / danger-bg=위험 표면 / lemon=번아웃 CTA / slate-50~100=비활성·배경)
- [ ] §2 실태 매트릭스: 본 plan §1.1을 옮겨오기
- [ ] §3 갭: blue-50 4중 의미 + warn-cta-bg 명명 + danger 표기 2종
- [ ] §4 후속 우선순위: audit #12-1(시간 칩·pedagogy 칩 neutral 화) / #12-2(warn-cta-bg 정정) / #12-3(danger 표기 통일) / #12-N+(semantic 토큰은 별 audit)
- [ ] PR 본문에 본 plan + audit #10 회수 link 둘 다 포함
- [ ] 코드 변경 0 — `bunx tsc --noEmit && bun run lint` 자동 통과

---

## 4단계 — PR + 머지·배포 (G4 합의 후)

- [ ] 단일 commit `docs(knowhow): tone↔의미 매핑 매트릭스 + audit #12-N 후속 우선순위`
- [ ] PR 생성
- [ ] 머지 (G4 합의)
- [ ] **production 배포 불필요** — 문서만, FE 영향 없음
- [ ] archive는 사용자 명시 시에만 (메모리 룰)
