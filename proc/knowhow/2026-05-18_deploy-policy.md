# 배포 정책 — PR 머지 ≠ production 즉시 반영

> 2026-05-18 작성 · G1 정렬 대기 · 풀림 플래너 운영 문서

## 룰 (확정)

**main 머지는 production 반영을 의미하지 않는다.** production 배포는 PM이 별도 슬롯에서 명시적으로 트리거할 때만 실행한다.

- 실행 커맨드: `vercel --prod --yes` (Vercel 프로젝트 `powershs-projects/pullim-planner`)
- 트리거 권한: PM(박승훈)만. 에이전트는 PM 명시 없이 실행 금지
- 머지된 PR이 production에 즉시 반영되지 않은 상태는 "누락"이 아니라 **정상 상태**

## 3시기 비교 (왜 이 정책으로 왔는가)

| 시기 | 방식 | 시작 | 종료 | 종료 사유 |
|---|---|---|---|---|
| (1) webhook 자동 | main push → Vercel Git webhook → 자동 build·deploy | 프로젝트 초기 | ~2026-05-13 | curea-co org에 Vercel app 미설치 + user 비-admin → webhook 미등록 상태가 long-term화 |
| (2) 머지 직후 수동 | PR 머지 즉시 `vercel --prod --yes` 수동 실행 | ~2026-05-13 | 2026-05-15 | 머지 cadence와 production cadence가 결합 → 매 머지마다 production 검증 부담. 결정·검증 비용을 PR 단위로 떠넘김 |
| (3) PM 명시 슬롯 (현재) | PM이 별도 슬롯에서 `vercel --prod --yes` 트리거 | 2026-05-15 | — | (이 문서) |

## 배포 결정 기준 후보 4안 트레이드오프 표

> PM 1순위 직관 없음. G1 정렬 대기.

| 축 | A. 정기 슬롯 | B. 누적 PR 임계 | C. G1 명시 | D. analytics 신호 |
|---|---|---|---|---|
| 트리거 | 주 N회 정기 (예: 화·금 17:00) | 누적 머지 PR ≥ N건 도달 시 | G1이 "배포해" 명시 | analytics 지표(reports F1·F5 등) 임계 도달 |
| 결정 비용 | 낮음 (자동 cadence) | 낮음 (임계 자동 산정) | 중간 (매번 1줄 합의) | 높음 (지표 정의·임계 합의 선행) |
| 반응성 (긴급 hotfix) | 낮음 — 다음 슬롯까지 대기 | 중간 — 임계 미만 시 대기 | 높음 — 즉시 명시 가능 | 낮음 — 지표 갱신 주기 의존 |
| 운영 부담 | 낮음 — slot reminder만 | 중간 — PR 카운팅 자동화 필요 | 낮음 — 합의 1줄 | 높음 — Vercel Web Analytics P0 의존 + 임계 룰 |
| 누락 위험 | 낮음 (cadence 강제) | 중간 (임계 미달 PR 적체) | 중간 (PM 부재 시 대기) | 중간 (지표 정의 모호) |
| G1 합의 비용 | 1회 (cadence만 합의) | 1회 (임계만 합의) | 매번 1줄 | 1회 (지표·임계 합의) + 운영 중 재합의 가능 |
| 현재 인프라 적합도 | ✅ (별도 도구 불필요) | ⚠️ (PR 카운팅 도구 필요) | ✅ (별도 도구 불필요) | ⚠️ (PR #13 Vercel Web Analytics P0 의존) |

### 권장 default
**C. G1 명시** — 현재 인프라(webhook 미복구, analytics P0만 도입) + 합의 비용 최소 + 반응성 가장 높음. 단점인 "매번 1줄" 부담은 PM 단독 의사결정이라 합의 round-trip 없음 → 실질 비용 낮음.

장기적 보완 후보 (별도 안건):
- C + (정기 슬롯 fallback): G1 응답 5일 무명시 시 자동 정기 슬롯 1회 트리거 — 적체 방지
- D 도입 조건: Vercel Web Analytics 데이터가 reports F1·F5 view 토글로 P0 1주 누적 후 신호 신뢰도 평가 → P1 단계에서 재검토

## G1 합의 결과

- 합의 일시: 2026-05-18
- 채택 안: **C. G1 명시** — PM이 "배포해" 명시할 때만 `vercel --prod --yes` 실행
- 비고: 권장 default 그대로 채택. 장기 보완(정기 슬롯 fallback / D analytics 신호)은 별도 안건으로 carry

## 첫 적용 대상

- PR #12 (데모 dead-end 정리) — 2026-05-15 머지, production 미반영
- PR #13 (Vercel Web Analytics P0) — 2026-05-15 머지, production 미반영
- 본 정책 G1 합의 직후 별도 슬롯에서 적용 판단

## 참조
- `~/.claude/projects/-Users-curea-dev-git-pullim-planner/memory/project_vercel_webhook_manual_promote.md` — webhook 미복구 배경
- `proc/knowhow/2026-05-12_extract-feature-and-deploy.md` §7.1 — webhook 검증 절차 (현재 미해결로 carry over 중)
- `proc/plan/2026-05-15_daily-tasks.md` — (2) 시기 폐기 결정 시점
