# 2026-05-15 (금) 일일 작업 plan

## 목표
- A: audit Top #6 이하 다음 audit plan 신규 작성 (어제 #5와 동일 4단계 패턴, 1·2단계까지 완료 + G4 합의)
- B: reports F1~F7 사용자 행동 분석 hook 방향성 결정 (3안 비교 + G1 합의 결과 1줄)

## 배경
- 활성 게이트키퍼: G1, G3, G4
- 어제 audit #5 (timeline trim) 머지·prod 반영 완료 → 다음 audit 후보 미선정 상태
- reports F1~F7 어제 dogfood로 production 노출만 확인됨 → 사용자 시그널 수집 경로 비어있음
- 배포 정책 확정: Vercel webhook 미사용, main 머지 후 `vercel --prod --yes` 수동 배포가 공식 프로세스 (webhook 복구 항목 종료)

## 작업 항목

### A. audit Top #6 이하 다음 plan 진입
- [x] **A-1 후보 발굴** — Explore 에이전트 + 직접 코드 감사로 5건 후보(weekly-summary mobile / builder min-h / 카드 컬러 / onboarding redirect / reports day 정보감) 정리. 검증 후 *데모 dead-end 버튼 3종* 패턴이 #5와 가장 일치하는 신규 발굴 후보로 부상
- [x] **A-2 후보 1건 선정** — `/planner` prev·next·순서 변경 3 버튼 dead-end. 추천 진행 룰: G4 미응답 시 후보 B(disabled + (데모) chip)로 진행
- [x] **A-3 fix 후보 3안 + 트레이드오프 표** → A(prop 미전달 hide) / **B(disabled+chip — 추천)** / C(1회 토스트). plan 안에 매트릭스 + 추천 명시
- [x] **A-4 plan 파일 작성** — [proc/plan/2026-05-15_demo-deadend-cleanup.md](2026-05-15_demo-deadend-cleanup.md) (4단계 구조 1·2단계 완료, 3단계 합의 후 진행)
- [ ] **A-5 (선택, 합의 시)** 구현 → PR → 머지 → `vercel --prod --yes`

### B. reports F1~F7 사용자 행동 분석 hook 방향성
- [x] **B-1 3안 비교 표** — Vercel Web Analytics / PostHog Cloud / 자체 `/api/events` (도입 비용·G3 운영 부담·이벤트 정의 자유도 + identify·funnel·cohort 축까지 확장)
- [x] **B-2 reports 페이지 특화 이벤트 후보 정리** — F1~F7별 우선 이벤트 1~2건 + cross-cutting `reports_view_change` + P0/P1/P2 단계 도입 순서
- [x] **B-3 knowhow 파일 작성** — [proc/knowhow/2026-05-15_reports-analytics-direction.md](../knowhow/2026-05-15_reports-analytics-direction.md) (G1 합의 자리 비워둠, 권장 default = A Vercel P0 3건)
- [ ] **B-4 G1 합의** — 17:30 closing 이전 결론 도달. 권장: A(Vercel) P0 3건만 도입

## 예상 블로커
- A 후보 자체 미선정 → AI 발굴 단계 추가로 1·2단계 완료 시점 늘어날 가능성
- B G1 합의 응답 시간 길어지면 17:30 closing까지 결론 미도달 → 짧은 표로 결정 비용 압축
- 수동 배포 누락 위험 → A 머지 직후 같은 슬롯에서 `vercel --prod --yes` 실행을 절차로 고정
- 17:30 4행 closing(약속 → 실제 산출 → PR·배포 → 검증) 첫 적용일 → 빈 행 없도록 작성 시 자가 점검

## 완료 기준 (17:30 closing 시점)
- [x] A: `proc/plan/2026-05-15_demo-deadend-cleanup.md` 1·2단계 채움 — commit 대기
- [x] B: `proc/knowhow/2026-05-15_reports-analytics-direction.md` 작성 — G1 합의 자리 비워둠, 권장 default 명시. commit 대기
- [ ] daily_outcome 17:30 4행(약속 → 실제 산출 → PR·배포 → 검증) 작성

## 산출물 요약
- `proc/plan/2026-05-15_demo-deadend-cleanup.md` — audit #6 plan (1·2단계 + G4 합의 대기)
- `proc/knowhow/2026-05-15_reports-analytics-direction.md` — B 의사결정 문서 (G1 합의 대기)
- 본 daily plan 자체 — A·B 추적 + 17:30 closing 가이드
