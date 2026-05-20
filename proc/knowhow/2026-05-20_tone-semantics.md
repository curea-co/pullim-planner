# 풀림 플래너 — tone↔의미 매핑 매트릭스 (audit #12)

> 2026-05-20 작성 · audit #12 추천 안 A 채택 결과물

audit #10([2026-05-19_card-color.md](../plan/2026-05-19_card-color.md))이 weekly insight surface 통합으로 카드 컬러 다양성을 5종 → 2종으로 surgical 회수했지만, 컴포넌트 전반의 **tone↔의미 분산**은 그대로 남음. 본 문서는 그 잔존을 정리하는 권위 매트릭스.

후속 spot 정정은 audit #12-1·#12-2·#12-3로 분할 진입 (§4).

---

## 1. 권장 의미 (tone × 단일 의미)

| tone | 권장 의미 | 사용 예 |
|---|---|---|
| `bg-pullim-blue-50` | **선택 상태 (active)** | 현재 선택된 카드·시간표·sidebar 항목 |
| `bg-pullim-blue-100` | **선택 상태 강조** (hover·focus의 다음 단계) | 진행 중 status, doing 배지 |
| `bg-pullim-success-bg` | **완료·긍정** | done 배지, good 컨디션, 달성 인사이트 |
| `bg-pullim-warn-bg` | **이월·skipped·경계 표면** | skipped 배지, mock 시험 배지, delete 경고 |
| `bg-pullim-warn` (solid) | **경계 강조** (표면 아닌 점·줄·아이콘) | section-intro signature dot |
| `bg-pullim-danger-bg` | **위험 표면** | bad 컨디션, hover delete |
| `bg-pullim-danger` (solid) | **위험 강조** (점·dot) | mock browser status dot |
| `bg-pullim-lemon` | **번아웃 CTA** (특수, 도메인 전용) | 번아웃 카드 CTA, 휴식 권유 |
| `bg-pullim-slate-25` ~ `100` | **비활성·배경** | 광범위 표면, 비활성 카드 |
| `bg-pullim-slate-200` ~ `400` | **비활성 강조** (border·점) | divider, 비활성 dot |

**원칙**: 1 tone = 1 의미. 같은 의미를 다른 tone으로 표현하지 않고, 다른 의미를 같은 tone으로 묶지 않음.

---

## 2. 현 사용처 매트릭스 (2026-05-20 grep 기준)

### 2.1 `bg-pullim-blue-50` 4종 의미로 분산 ⚠️

| 의미 분류 | 컴포넌트 | 권장 |
|---|---|---|
| **선택 상태 (active)** | planner-manage/planner-card:64, planner-manage/decorate-section:290·329·392·458, planner/today-timeline:62 (doing), shell/app-sidebar:100 (active nav) | ✅ 권장 의미 |
| **info 헤드라인** | planner/today-reflection:19·76 (sparkle), shell/flywheel-note:15, shell/app-header:50 (label), shell/onboarding-template:121·160 (step badge) | ⚠️ 분리 대상 |
| **시간 칩 (mono number)** | planner/side-timeline-24:159 (시간 라벨) | ⚠️ neutral로 분리 |
| **pedagogy 칩 (보조 메타)** | planner/pedagogy-tag:28·43·61 (학습 엔진 메타) | ⚠️ neutral로 분리 |
| **empty state icon halo** | planner-manage/empty-state:10 | ⚠️ neutral로 분리 |

### 2.2 warn 표기 ⚠️

| 표기 | 권장 의미 | 현 사용 |
|---|---|---|
| `bg-pullim-warn-bg` | 표면 (배지·dialog·이월) | today-timeline:64, block-card:30·99, today-reflection:21·232, condition-burnout-panel:64, delete-confirm-dialog:42 |
| `bg-pullim-warn-cta-bg` | (이름 모호) — 실제로 1px 스트라이프·텍스트 강조선에 사용 | d-day-header-band:27 (band 1px), block-card:65 (stripe), condition-burnout-panel:64 (text 자리) |

⚠️ **이름↔역할 불일치**: `warn-cta-bg`는 "cta 배경"으로 명명됐지만 실 사용은 strip·line·강조. 권장은 `bg-pullim-warn` (solid) 또는 `border-pullim-warn`로 정정.

### 2.3 danger 표기 분산 ⚠️

| 표기 | 의미 | 사용 |
|---|---|---|
| `bg-pullim-danger-bg` | 위험 표면 | condition-burnout-panel:65, planner-builder/step-content:579 hover |
| `bg-pullim-danger/10` | (동일 의미, 다른 표기) | planner/home/monthly-progress-card:97, planner/reports/monthly-summary:84, planner-builder/step-content:1099 |
| `bg-pullim-danger/50` | 위험 dot | shell/mock-browser:33 |

⚠️ **표기 분산**: `bg-pullim-danger-bg` vs `bg-pullim-danger/10` 동일 의미. 한쪽으로 통일 권장(둘 다 토큰 변경 시 검색 비용 ↑).

---

## 3. 권장 vs 실태 갭 (정정 대상 리스트)

| # | 갭 | 영향 컴포넌트 수 | 정정 패턴 |
|---|---|---|---|
| G1 | `bg-pullim-blue-50`이 info·시간 칩·pedagogy·empty halo에 분산 | 5+ 파일 | 시간 칩·pedagogy·empty halo는 `bg-pullim-slate-50/100`으로 변경 |
| G2 | `bg-pullim-warn-cta-bg` 이름↔역할 불일치 | 3 파일 | `bg-pullim-warn` (solid 1px) 또는 `border-pullim-warn`로 변경 |
| G3 | `bg-pullim-danger-bg` vs `bg-pullim-danger/10` 표기 분산 | 5 파일 | 한쪽으로 통일 — 권장 `bg-pullim-danger-bg` (token 명) |

---

## 4. 후속 spot 정정 우선순위

audit #12를 sub-audit으로 분할 진입:

| sub-audit | 범위 | 권장 진입 시점 | G4 합의 비용 |
|---|---|---|---|
| **audit #12-1** | G1 — 시간 칩·pedagogy·empty halo → slate | 다음 1주 안 | 중간 (pedagogy 칩 색 변경 미감 합의) |
| **audit #12-2** | G2 — warn-cta-bg 정정 | 다음 2주 안 | 낮음 (명명 정합) |
| **audit #12-3** | G3 — danger 표기 통일 | 다음 2주 안 | 낮음 (검색·치환) |
| **audit #12-N+** | semantic 토큰 도입 (`--surface-info` 등 CSS 변수 + Tailwind 별칭) | 별 audit으로 격상, 큰 PR | 큼 |

**audit #12-1 우선 권장 이유**: blue-50 4종 의미가 가장 시각 위계 흐림 위험 큼 (선택 상태 vs info vs 보조 칩 구분 모호). #12-2/3는 명명·표기 정합으로 후속 자연 처리.

---

## 5. 참고

- 본 문서 트리거: [2026-05-20_card-color.md](../plan/2026-05-20_card-color.md) (audit #12) 추천 안 A
- 우회 처리 선행: [2026-05-19_card-color.md](../plan/2026-05-19_card-color.md) (audit #10) — surface 수 회수
- 5월 15일 A-1 후보 5건 중 본 audit으로 "카드 컬러" 결정 부담 명문화 회수 완료
