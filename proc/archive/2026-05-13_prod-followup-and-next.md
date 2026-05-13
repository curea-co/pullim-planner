# PR #7 production 반영 + 다음 작업 선택

## 목표
어제 머지된 PR #7(audit Top 3 fix)을 production에 반영하고, Vercel 자동 배포 webhook을 근본 복구한 뒤, 다음 fix 또는 신규 도메인 plan으로 진행.

## 배경
- 어제 PR #7 main 머지 완료 (commit `8c080f8`), 그러나 Vercel Git integration 끊김 상태로 production 미반영
- verify-prod-pr7.mjs 결과: breadcrumb·사이드바·빌더 grid 3축 모두 옛 코드 서빙 중
- 메타데이터(임베딩)는 그저께 수동 Promote로 풀림 플래너 유지 — 카톡 카드는 정상
- main의 새 commit(`8c080f8`, `ed98d22`, `39ae663`)이 Vercel Deployments에 잡히지 않음

## 작업 항목

### A. PR #7 production 반영 (사용자 액션 + AI 검증)
- [ ] Vercel 대시보드 → Deployments → PR #7 commit(`8c080f8`)이 있는 Preview "..." → **Promote to Production** *(사용자)*
- [ ] Promote 직후 `verify-prod-pr7.mjs` 재실행 — 3/3 PASS 확인 *(AI)*
  - breadcrumb = `풀림 플래너 > 시간표 관리`
  - 사이드바 첫 항목 = `풀림 플래너`
  - 빌더 팔레트 grid columns = 3
- [ ] 카톡·Twitter 카드 메타 회귀 없음 확인 — `verify-brand-prod.mjs` 재실행 75/75 PASS 유지

### B. Vercel Git integration 근본 복구
- [ ] Vercel **Settings → Git → Connect Git Repository** 마무리 *(사용자)*
  - GitHub `curea-co/pullim-planner` 선택
  - Production Branch = `main` 명시
- [ ] 빈 commit 또는 다음 머지로 webhook 자동 트리거 검증
- [ ] 검증되면 향후 머지마다 수동 Promote 불필요

### C. 다음 작업 — 둘 중 1 선택
- [ ] **C-1**: audit Top #5 — 타임라인 빈 시간대 trim (1~2h 예상)
  - 첫 일정 1h 전 ~ 마지막 일정 1h 후만 기본 표시
  - "전체 보기" 토글 추가
  - 4종 day-layout(vertical_timeline·checklist·block_cards·pie_list) 모두 영향 — 공통 helper 또는 layout별 분기
  - 빌더 layout 탭 미리보기도 동일 trim 적용 여부 결정 필요
- [ ] **C-2**: 신규 도메인 plan 작성 — 다음 중 1 선택
  - 회고/리포트 강화 (현재 라우트만 있음)
  - 번아웃 신호 시각화 (mock 데이터는 있는데 노출 안 됨)
  - 학부모 영역 (IA에는 있으나 미구현)
  - 알림 시스템 (헤더 종 아이콘만 placeholder)

## 완료 기준
- A·B 모두 통과 → production 갱신 + 자동 배포 복구
- C-1 또는 C-2 중 하나 처리 (C-1은 PR 머지, C-2는 plan 작성)

## 참고
- 어제 archive: `proc/archive/2026-05-12_audit-top-fixes.md`
- production 검증 스크립트:
  - `verify-prod-pr7.mjs` (PR #7 3축) — /tmp/brand-verify/에만 있음, git 미보존
  - `proc/research/2026-05-11_brand-rename/verify-brand-prod.mjs` (5 UA × 3 라우트 메타)
- main 최신: `39ae663`
