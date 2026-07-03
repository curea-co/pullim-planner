# 홈 실데이터(블록 materialize) + 헤더 KCB 실명 배지

> clean base = PR #106 머지 완료(dev QA 1·3·4·5·6). 두 트랙 모두 **pullim-api(BE) 중심** — api 로컬에서 착수.
> dev QA 잔여(#2)와 신규 요청(헤더 배지)을 함께 처리.

## 목표
① 실 사용자가 시간표를 만들면 **홈에 본인 설정 기반 실 스케줄**이 뜨고(주/월 그리드까지 실데이터) 완료·리포트가 동작한다.
② 헤더 사용자 배지·아바타가 **이메일이 아니라 KCB 본인인증 실명**을 표시한다.

---

## 트랙 A — 홈 실데이터 + 블록 materialize (item 2, 코어)

### 현황(근본 원인)
- 홈(`HomeContainer`)이 mock을 읽음: `getActivePlanner`·`getDday(persona)`·`getBlocksForDayOffset`, 주/월은 `weekView`/`monthView` 하드코딩(04월 데모).
- 새 플래너는 **블록 0**(materialize 미구현) → 실 API로 홈을 연결해도 빈 스케줄.
- 실 API 메서드(`pullimPlannerClient.list/blocks/routines`)는 있으나 홈·주/월 미연결.
- 권위 계획: `pullim-api/docs/planner/2026-07-01_block-materialize_plan.md` (생성 규칙 v1·재생성 정책 상세).

### 작업 항목
- [x] **B0** `time_blocks.source`(generated/routine/manual) 컬럼 — #261 dev 머지
- [ ] **B1** `SchedulePlannerService` 순수함수 + **결정론적 단위테스트**(pullim-api)
  - 입력: examStart~End · weekday/weekendHours · subjectUnits · blockPattern · D-day
  - 규칙: 가용창 → 블록패턴 슬롯(pomodoro 25+5 / focused 50+10 / deep 90+15) → 과목 인터리빙(연속 금지) → D-day 유형 가중(개념/문제/복습) → 단원 라운드로빈 → 과목 균형
  - 테스트: 평일/주말 창·슬롯 수·인터리빙·D-day 유형 shift·단원 순환·과목 균형(DB 없이 검증)
- [ ] **B2** create-planner(+activate)에서 bake — 생성엔진 → `insertTimeBlocks`(루틴 bake 경로 재사용, 같은 TX), routine bake와 overlap 정합(순서 확정)
- [ ] **B3** 재생성 정책 — PATCH 생성입력 변경 시 **미래·미완료·source=generated 만 재bake**, `manual`·`routine`·완료·과거 **보존**(조용한 자동 재생성 금지)
- [ ] **B4** planner FE 홈 mock→real — `getActivePlanner`→실 active(`pullimPlannerClient.list`), `getBlocksForDayOffset`→`pullimPlannerClient.blocks`, **주/월 그리드(weekView/monthView)도 실 블록 집계**로 교체 → #106에서 남긴 헤더-그리드 불일치 해소, D-day도 실 active 기준
- [ ] 검증 — 실 사용자 시간표 생성 → 홈 실 스케줄 + 완료/리포트 동작 · per-user 격리 · 주/월 실데이터

### ⚠️ 게이트
- B2~ **dev 반영(머지+migration:run)은 BE 담당자 승인 게이트**(2026-06-29~). `migration:generate`만(수기 금지).
- B1은 DB 무관 순수함수 → **안전한 착수점**. B4(FE)는 BE 배포 후 held.
- FE/BE PR 분리(리포 최상위 룰): pullim-api(B1~B3) / planner FE(B4) 별도.

---

## 트랙 B — 헤더 사용자 배지: 이메일 → KCB 실명

### 현황(근본 원인)
- 헤더(`apps/planner/components/shell/app-header.tsx` `ProfileMenu`)는 **이미 `user.name` 표시**(배지 라벨·아바타 이니셜) — FE 변경 불요.
- `user.name` = `/planner/me` 의 `name` = `pullim-api src/planner/modules/me/service/me.service.ts:104` `projection?.displayName ?? ''` — **auth `ProfileProjection.displayName`** 소유(ADR-011, planner 미보유).
- dev에서 이메일 노출 = ProfileProjection이 실명 미설정 시 **이메일을 displayName 폴백**으로 내려주는 것으로 추정. KCB 실명(#251 displayName)은 존재.

### 작업 항목
- [ ] pullim-api **auth `ProfileProjection` 구현** 확인 — `displayName` 소스가 이메일 폴백인지, KCB 실명(#251) 우선인지 검증
- [ ] `displayName` = **KCB 본인인증 실명 우선**(이메일 폴백 제거 또는 실명>닉네임>빈문자 순) 으로 수정
- [ ] (FE) 헤더 무변경 확인 — BE 반영 시 `user.name` 자동 실명화. 빈 실명 폴백('?') 동작 유지
- [ ] 검증 — KCB 실명 회원의 `/planner/me` `name`=실명 → 헤더 배지·아바타 이니셜 실명 표시(이메일 미노출)

### ⚠️ 주의
- `ProfileProjection`/displayName은 **auth 도메인 소유** — planner가 아니라 auth 측 수정. auth 표시명 정책(실명 vs 닉네임 노출)은 오너 결정 확인.
- 미성년 안전: 헤더는 본인 화면이라 본인 실명 노출 OK(피어 노출 아님 — studygram 닉네임 정책과 별개).

---

---

## 트랙 C — UX 라이팅(온보딩 문구 + 전문용어·외래어 순화) [planner FE 단독]

### 정책
- **대상 = 대한민국 고등학생.** 전문 UI 용어·외래어를 **최소화**하고 쉬운 한국어로. 청유형 톤.
- 미구현 기능 과장 금지(#106 연장선 — "자동/AI/재최적화" 류 과대약속 배제).

### 작업 항목
- [ ] **온보딩 상단(identity) 문구 확정** (`OnboardingPresenter.tsx`): 현재(#106본) → **정확히 아래로**
  - to-be: `학습과학 원리에 따라 스스로 공부 계획을 세워 보아요. 친구와 공유할 수도 있어요.`
  - (원문 "7대 학습과학을 자동 적용하고 … 매일 재최적화 플라이휠"은 #106에서 이미 제거됨 — 위 문구로 대체 확정)
- [ ] **전문용어·외래어 순화** — 사용자 노출 텍스트 전수 교체(제안 대응):
  | as-is | to-be(안) |
  |---|---|
  | 사이드 트래커 / 트래커 | 하루 시간 막대(24시간 시간표) |
  | 그리드 | 표 / 칸(요일별 표) |
  | 히트맵 | 학습량 달력(색으로 채운 달력) |
  | 마커 | 표시(깃발 표시) |
  | 블록 hero | 다음 학습 카드 |
  | 슬라이더 | 조절 막대 |
  | 플라이휠 / 재최적화 | 선순환 / 다시 맞춤(또는 문구 재작성·제거) |
  - 분포(실측): 그리드 9 · 히트맵 5 · 슬라이더 4 · (사이드)트래커 2 · hero 2 · 마커 1 · 플라이휠 2 · 재최적화 1 (파일 수)
  - 범위: `OnboardingPresenter`(집중) + `planner-home` 위젯·`flywheel-note` 등 사용자 노출 텍스트. **코드 식별자·data-slot·주석은 제외**(사용자 문구만).
- [ ] 검증 — 온보딩·홈 화면에서 외래어 잔존 0(사용자 노출), 고등학생이 바로 이해되는 문장

### 주의
- **사용자 노출 카피만** 교체(변수/함수/CSS 클래스명 유지 — 회귀 방지).
- 정책 위반 잔존 표현 있으면 같은 원칙으로 추가 순화.

---

## 순서 권고
1. **트랙 C**(UX 라이팅) — FE 단독·저위험·빠른 값. 온보딩 identity + 용어 순화.
2. **트랙 B**(배지) — 작고 독립. api 로컬에서 projection 확인·수정.
3. **트랙 A B1**(SchedulePlannerService + 테스트) — DB 무관 착수 → B2/B3(게이트) → B4(FE, 배포 후).
