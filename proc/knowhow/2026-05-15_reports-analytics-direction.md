# reports F1~F7 사용자 행동 분석 hook 방향성 — 2026-05-15

어제(2026-05-14) production dogfood로 F1~F7 7건이 모두 시각 노출됐음을 확인했지만 **사용자 시그널 수집 경로가 비어 있는 상태**가 남았다. 이를 해소하기 위한 analytics 도입 방향을 3안 비교로 정리한다.

## 컨텍스트
- 활성 게이트키퍼: **G1** (도입 의사결정·운영 정책)
- 어제 head: `26204f1` ([proc/knowhow/2026-05-14_reports-prod-dogfood.md](../knowhow/2026-05-14_reports-prod-dogfood.md))
- 현재 의존성: Next 16, React 19, recharts, sonner, @base-ui/react — **analytics 패키지 0개**
- 배포: Vercel (수동 `vercel --prod --yes` 정책. webhook 미사용)
- 사용자 수: PM·내부 dogfood만 (외부 트래픽 0)

## 1. 3안 비교 표

### 1.1 도입·운영 축

| 축 | A: Vercel Web Analytics | B: PostHog Cloud | C: 자체 `/api/events` + 로그 |
|---|---|---|---|
| 패키지 | `@vercel/analytics` (라이트 클라이언트) | `posthog-js` (클라이언트 라이브러리 ~50KB) | 없음 — `fetch('/api/events', ...)` 1줄 helper |
| 도입 시간 | 🟢 5분 (npm install + `<Analytics />` mount + 환경 변수 0개) | 🟡 30분 (계정 생성 + project key + provider mount + opt-in capture) | 🟡 1~2h (route + storage 결정 + helper) |
| 무료 한도 | 🟢 Vercel 프로젝트당 월 2,500 events (Hobby) — 내부 dogfood 충분 | 🟢 월 1M events free (cloud) | 🟢 무한 (storage 책임은 우리 쪽) |
| 운영 부담 (G3) | 🟢 거의 0 — dashboard 자동 | 🟢 거의 0 — dashboard 자동 | 🔴 로그 보관·schema 관리·query UI 직접 |
| 데이터 소유 | 🟡 Vercel cloud에 종속 | 🟡 PostHog cloud에 종속 (self-host 가능하나 운영비 ↑) | 🟢 100% 자체 |
| 다음 단계 비용 (분석 UI) | 🔴 페이지/이벤트 별 카운트만 — funnel·cohort·session replay 없음 | 🟢 funnel·session replay·feature flag 포함 | 🔴 직접 만들거나 BI 도구 별도 |
| 풀림 G1 정책 적합도 | "최소 비용으로 시그널만 받자" 매칭 | "사용자 시나리오 분석까지 필요"면 매칭 | "외부 cloud 거부"면 매칭 |

### 1.2 이벤트 정의 자유도

| 축 | A: Vercel | B: PostHog | C: 자체 |
|---|---|---|---|
| custom event 정의 | 🟢 `track('event_name', { props })` API | 🟢 `posthog.capture('event', { props })` — 풍부 | 🟢 schema 자유 |
| 자동 page view | 🟢 자동 | 🟢 자동 | 🔴 수동 hook |
| identify (persona) | 🔴 익명만 | 🟢 `posthog.identify(id, traits)` — 페르소나 추적 | 🟢 자유 |
| 임계 hover·dwell·scroll | 🟡 custom event 필요 (자동 없음) | 🟢 autocapture로 일부 자동 + heatmap | 🔴 직접 작성 |

### 1.3 한 줄 평
- **A (Vercel)**: 도입 비용 최소·운영 부담 0·dashboard 기본 제공. *funnel·cohort 없음*이 한계
- **B (PostHog)**: 분석 깊이 최고·dogfood 단계엔 과잉, 학생/부모 PII가 있을 경우 처리 정책(G1)을 한 번 검토해야 함
- **C (자체)**: 데이터 주권 최고·운영 부담 최대, 지금 단계엔 ROI 음수

## 2. reports F1~F7별 우선 이벤트 후보

어제 dogfood에서 시각 노출만 확인된 7개 항목에 대해, **사용자 시그널이 비어 있는 경로**를 채울 우선 이벤트 후보 1~2개씩.

| F# | 항목 | 우선 이벤트 후보 | props (예시) | 측정 의도 |
|---|---|---|---|---|
| **F1** | Day TodayReflection default expanded | `reports_day_reflection_view` (impression 1회) | `{ view: 'day', defaultOpen: true }` | day 진입 시 펼친 상태 도달 여부 — 기본 노출이 의미 있는지 검증 |
|   |   | `reports_reflection_cta_click` | `{ cta: 'tomorrow_calendar' \| 'close_today' }` | 회고 CTA 클릭률 → "다음 행동 유도" 효과 측정 |
| **F2** | Weekly 메트릭 실제 주간 평균 | `reports_week_metric_view` | `{ metric: 'hours' \| 'accuracy' \| 'weak' \| 'emotion', has_delta: true }` | week view metric 카드 mount — 4개 KPI 노출 시간 측정 base |
| **F3** | Weekly insights 동적 생성 | `reports_week_insight_view` | `{ kind: 'sparkle' \| 'check' \| 'warn', text_hash }` | 동적 인사이트 노출 분포 → warn 비율이 학습 행동과 연관되는지 |
| **F4** | Burnout·Condition trend | `reports_week_burnout_threshold_hit` | `{ day: '금', score: 58 }` | 번아웃 임계 이하 도달 카드 노출 — 위험 신호 가시성 |
|   |   | `reports_week_condition_emoji_hover` (선택) | `{ day: '월', level: 4 }` | 컨디션 emoji hover dwell — 7일 trend 인지 |
| **F5** | ParentReportCard | `reports_parent_card_open` | `{ trigger: 'send_button' }` | 부모 dialog open 빈도 — 부모 공유 욕구 측정 |
|   |   | `reports_parent_send_consent` | `{ scope: 'this_week' \| 'this_month' \| 'always', toggles: ['weekly','weak'] }` | consent 토글 + 기간 선택 분포 |
| **F6** | Month "100% 완료한 날" 임계 | `reports_month_kpi_view` | `{ days_100pct: 4, streak: 17, progress_pct: 77 }` | 완화된 임계(95%↑)가 사용자 동기에 어떻게 작동하는지 month KPI snapshot |
| **F7** | vs 지난주 delta | `reports_week_delta_view` | `{ metric, delta_sign: 'up' \| 'down' \| 'flat', delta_value }` | delta 화살표 + 색상 변화가 *어떤 metric에서 가장 잘 보이는지* |

### 2.1 cross-cutting 이벤트 (모든 view 공통)
- `reports_view_change` — `{ from: 'day', to: 'week' }` — 토글 사용 빈도
- `reports_page_dwell_end` — `{ view, ms }` — 페이지 체류 시간 (mount~unmount)

### 2.2 단계 도입 권장 순서
1. **P0 (도입 즉시)**: `reports_view_change` + `reports_day_reflection_view` + `reports_parent_card_open` — 3건만 먼저
2. **P1 (P0 후 1주)**: F2·F3·F6·F7 view 이벤트 4건 — KPI 노출 base 확보
3. **P2 (P0 후 2~4주)**: dwell·hover·consent toggle 분포 등 풍부한 이벤트

## 3. G1 합의 결과

> **결정 (2026-05-15, G1)**: **A (Vercel Web Analytics) P0 3건 도입**. PostHog·자체 telemetry는 시그널이 쌓여 funnel·cohort가 필요해질 때 마이그레이션 비용으로 분리.
>
> 사유: 이 단계는 *시그널 채널 자체*가 비어 있는 상태 해소가 목적. 분석 깊이는 *데이터가 쌓인 뒤* 결정. Vercel은 도입 비용·운영 부담 최저이고 무료 한도 내.

## 후속 (별개)
- 합의 후 P0 3건 구현 plan 별도 (예상 30분 — package install + `<Analytics />` mount + `track()` 3곳 호출)
- 합의 후 reports F1~F7 별 P1 4건 추가 구현 plan 별도
- PII(부모 연락처·페르소나) 처리 정책은 어느 안이든 별 검토 필요

## 참고
- 어제 dogfood: [proc/knowhow/2026-05-14_reports-prod-dogfood.md](../knowhow/2026-05-14_reports-prod-dogfood.md)
- 어제 F1~F7 archive: [proc/archive/2026-05-13_reports-f1-to-f7-impl.md](../archive/2026-05-13_reports-f1-to-f7-impl.md), [proc/archive/2026-05-13_reports-enhancement.md](../archive/2026-05-13_reports-enhancement.md)
- reports 셸: [src/components/planner/reports/reports-shell.tsx](../../src/components/planner/reports/reports-shell.tsx)
- reports 페이지: [src/app/(student)/planner/reports/page.tsx](../../src/app/(student)/planner/reports/page.tsx)
