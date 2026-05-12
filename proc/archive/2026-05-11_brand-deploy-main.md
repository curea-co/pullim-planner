# 임베딩 브랜드 노출 — production 반영

## 목표
production(`main`) URL을 임베딩했을 때 카카오톡·Twitter 카드에 "풀림 플래너"가 노출되도록, 이미 작성된 변경분(PR #3 brand-rename + PR #4 week-layout)을 `main`까지 전개.

## 배경
- PR #3(brand-rename) 위치: `origin/dev` (`bb24117`)
- PR #4(week-layout) 위치: `origin/feat/brand-rename-pullim-planner` (`7251b69`) — PR base를 변경 않고 머지해서 brand 브랜치에만 들어감
- `origin/main`은 PR #2까지만 → production 임베딩이 여전히 `풀림 스터디 — AI 학습 파트너`
- 메타데이터(`src/app/layout.tsx`) + UI 잡티(`features.ts` 주석·stageDescription)는 PR #3에서 이미 수정 완료
- 잔존 `풀림 스터디룸`(`features.ts` L84)은 feature 이름이라 **유지**(PR #3 archive D2 결정 따름)

## 작업 항목

### 머지 전개
- [x] 로컬 `dev` 브랜치를 `origin/dev`로 fast-forward 동기화
- [x] `feat/brand-rename-pullim-planner` → `dev` 정리 (PR #5 — PR #4 변경분 흡수)
- [x] `dev` → `main` PR 생성 + 머지 (PR #6, `ad1a2df`)
- [x] Vercel production 자동 배포 완료 확인 — **자동 webhook 실패**, 수동 Promote로 복구

### 검증
- [x] production URL(`https://pullim-planner.vercel.app`)을 카카오톡·Twitter·Facebook·Slack UA로 fetch — `풀림 플래너` 노출 + `풀림 스터디` 0건. **75/75 PASS**
- [x] 스크립트: `proc/research/2026-05-11_brand-rename/verify-brand-prod.mjs` (BASE_URL을 production으로 변수화)

### 정리
- [x] 본 plan을 archive 이동

## 결과 (2026-05-12)

- 머지 stack 정리: PR #5(brand→dev), PR #6(dev→main) 완료
- production 갱신: Vercel Git integration의 main → production 자동 배포 webhook이 PR #6 머지 후 작동 안 함. main에 빈 commit(`211fa4f`) push로 재트리거 시도했으나 여전히 누락. 사용자가 Vercel 대시보드에서 수동 Promote to Production 실행해 즉시 갱신.
- 5종 크롤러 UA × 3 라우트 = 75건 PASS, 0 FAIL.

## 사후 (follow-up 후보)

- Vercel **Git integration 재설정** — main 자동 배포 webhook 작동 확인 필요. 사용자가 disconnect 후 reconnect 시도했으나 중단됨.
- 그 전까지 모든 main 머지 후에는 **수동 Promote** 또는 `vercel --prod` 필요.

## 참고
- 이전 brand-rename 작업 본문: `proc/archive/2026-05-11_brand-rename-pullim-planner.md`
- 이번 plan은 그 후속 — *production 반영*에 한정
