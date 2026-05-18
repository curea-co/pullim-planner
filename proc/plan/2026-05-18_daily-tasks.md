# 2026-05-18 (월) 일일 작업 plan

## 목표
- A: 배포 정책 명문화 — 금요일(2026-05-15) 결정한 "PR 머지 ≠ production 즉시 반영" 룰을 운영 문서로 고정. 배포 결정 기준 후보 4안 트레이드오프 표 + G1 1줄 정렬
- C: audit Top #7 다음 plan 진입 — "builder min-h" 사전 선정 (audit #5 timeline trim 인접 + 작업량·G4 합의 비용 적음). 어제 #5·#6 4단계 패턴 1·2단계까지

## 배경
- 활성 게이트키퍼: G1, G3, G4
- 금요일 17:30 carry over 5건 중 (1) 배포 정책 명문화 + (2) audit #7 plan 진입을 보수적으로 09:30 약속에 묶음
- PR #12(데모 dead-end) / PR #13(Vercel Web Analytics) 모두 머지 완료 — production 반영은 A 결정 후 별도 슬롯
- 3일 갭(주말) 후 첫 작업일 — 컨텍스트 복구 비용 고려해 약속 보수적, 풀스택은 합의 후
- audit #7 후보 `builder min-h`는 금요일 A-1 후보 5건 중 1건 (timeline trim 인접 + 작업량 적음)

## 작업 항목

### A. 배포 정책 명문화 (G1 정렬)
- [x] **A-1 배포 정책 룰 초안 작성** — 3시기 비교: (1) webhook 자동 시기(폐기) / (2) 머지 직후 수동 시기(폐기) / (3) 현재 머지≠배포 정책. AI 1차 자동 생성 후 PM 검수
- [x] **A-2 배포 결정 기준 후보 4안 트레이드오프 표** — 정기 슬롯 / 누적 PR 임계 / G1 명시 / analytics 신호. 비용·반응성·운영 부담 축. PM 1순위 직관 없음 명시
- [x] **A-3 knowhow 파일 작성** — [proc/knowhow/2026-05-18_deploy-policy.md](../knowhow/2026-05-18_deploy-policy.md)
- [x] **A-4 G1 합의** — 채택: **C. G1 명시** (2026-05-18). PM이 "배포해" 명시할 때만 `vercel --prod --yes`

### C. audit Top #7 builder min-h plan 진입
- [x] **C-1 spot check** — `src/components/planner-builder/*` + 빈 영역 처리 로직 + min-height 현재값 + 사용처 일관성 매트릭스 작성 완료
- [x] **C-2 fix 후보 3안 + 트레이드오프 표** — A 부모 기준 통일 / B 자식 기준 통일 / C 구조 재설계. 추천: A
- [x] **C-3 plan 파일 작성** — [proc/plan/2026-05-18_builder-min-h.md](2026-05-18_builder-min-h.md) (4단계 구조 1·2단계 완료)
- [x] **C-4 G4 합의** — 채택: **A. 부모 기준 통일** (2026-05-18). 3·4단계 풀스택 진입 가능
- [x] **C-5 풀스택 진입** — 구현(SubjectCard min-h-[150px] + Step 8 flex 중앙) → tsc 통과 → PR #14 → squash merge (2026-05-18)
- [x] **C-6 production 반영** — `vercel --prod --yes` 실행 (G1 명시 슬롯 적용)

### (약속 외 carry) PR #12·#13 production 반영
- [x] **carry-1** — G1 합의(C. G1 명시) 직후 별도 슬롯에서 PM 명시 → `vercel --prod --yes` 1회 실행으로 #12·#13 production 반영 (READY, https://pullim-planner.vercel.app)

## 예상 블로커
- A G1 정렬 응답 시간 — 정책 문서이므로 1줄 합의 필요. 응답 지연 시 17:30까지 결론 미도달 가능 → (1)·(2) PM 단독 진행, (3) G1 응답 대기로 분리. 약속 ✅ 판정은 (1)·(2) 충족이면 가능, 다만 17:30 4행 closing "검증" 행에 ⚠️ 부분 달성 위험
- C builder min-h 영향 범위 — `planner-builder` + `builder` 디렉토리 둘 다 + 빌더 사용처(시간표 신규 작성 / 시간표 수정 / onboarding) 영향. 1단계 spot check 5분 추정보다 늘어날 가능성
- 3일 갭(주말) 후 컨텍스트 복구 — 금요일 17:30 carry over 5건 중 PR #12·#13 배포는 A 결정 후 별도 슬롯(약속 외 분리), plan archive는 사용자 명시 대기. 09:30 약속은 A·C로 보수적 묶음
- 보수적 약속 + 풀스택 초과 패턴 3일 연속(audit #5·#6 + 오늘 #7) — 약속 위반 없이 풀스택까지 가는 cadence 유지하되, 오늘은 배포 정책 명문화 슬롯이 추가로 들어와 풀스택 슬롯 압축 가능성

## 완료 기준 (17:30 closing 시점)
- [x] A: `proc/knowhow/2026-05-18_deploy-policy.md` 작성 — 머지≠배포 룰 명문화 + 4안 트레이드오프 표 + **G1 합의 결과 채움 (C. G1 명시)**
- [x] C: `proc/plan/2026-05-18_builder-min-h.md` 1·2단계 채움 — 갭 분석 매트릭스 + fix 후보 3안 + 추천 안 명시 + **G4 합의 결과 (A. 부모 기준 통일)**
- [ ] daily_outcome 17:30 4행(약속 → 실제 산출 → PR·배포 → 검증) 작성
- [ ] (선택) C 풀스택 진입 시 commit·PR·머지

## 산출물 요약
- `proc/knowhow/2026-05-18_deploy-policy.md` — A 배포 정책 운영 문서 (G1 합의 대기)
- `proc/plan/2026-05-18_builder-min-h.md` — audit #7 plan (1·2단계 + G4 합의 대기)
- 본 daily plan 자체 — A·C 추적 + 17:30 closing 가이드
