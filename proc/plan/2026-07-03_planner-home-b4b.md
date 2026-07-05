# B4b — 홈 실데이터 후속: 위젯 실 표면·기간 API·날짜 딥링크

- 작성: 2026-07-03 (B4 #110 머지 직후) · **개정: 2026-07-03 — 게이트키퍼 제약·소프트오픈 반영(§0)**
- 선행: B4(#110) — 홈 일·주·월이 활성 플래너 실 블록을 읽음. 블록 외 mock 수치 위젯
  (WeeklyChart·WeeklyGoalsCard·MonthlyProgressCard)은 실모드에서 **숨김** 상태.
- 관련: ADR-056(materialize), `proc/plan/2026-07-02_planner-materialize-and-name-badge.md`(트랙 A)

## 0. 개정 — 제약 2건과 우선순위 재편 (2026-07-03)

**제약 ①: BE API 신설·스키마 수정은 AI 작업 금지(게이트키퍼).** pullim-api 에 엔드포인트를
만들거나 스키마를 바꾸는 작업은 게이트키퍼 방침상 담당 개발자가 직접 한다. 따라서
⓪(완료 기록 API)·②(기간 API)의 BE 파트와 ①-2단계(goal 스키마)는 **BE 핸드오프 항목**으로
전환 — 본 계획의 §2 해당 절은 BE 담당자에게 전달할 요구 명세로 쓴다. AI(Claude)가 착수
가능한 것은 **FE 단독 트랙**(③ 딥링크, ①-1단계 축소 복원)과 BE 개통 후의 api-client·FE 배선뿐.

**제약 ②: soft open 2026-07-10 — 미구현 화면 정리가 최우선.** 성장 리포트 화면은
soft open 까지 BE 개발이 어려움 → mock 화면을 사용자에게 노출하지 않는다.

**재편된 우선순위:**

| 순위 | 작업 | 수행 주체 | 상태 |
|---|---|---|---|
| **1** | 소프트오픈 정리 — `REPORTS_ENABLED` 게이트(LNB·하단탭 숨김 + `/planner/reports` redirect) + 온보딩 4번 카드 "성장 리포트 출시 예정"(미리보기 스크린샷 포함) + 매뉴얼 모달 문구 정합 | AI (FE) | ✅ 본 개정과 함께 착수 |
| **2** | ③ 날짜 딥링크 (FE 단독) | AI (FE) | 대기 |
| **3** | ①-1단계 위젯 축소 복원 (FE 단독 — 블록 파생값만) | AI (FE) | 대기 |
| 핸드오프 | ⓪ 완료 기록 API · ② 기간 API (BE) · ①-2단계 goal 표면 | **BE 담당자 직접** | §2 명세 전달 |
| 후속 | ⓪·② BE 개통 후 api-client 메서드 + FE 배선 | AI (FE) | BE 대기 |

## 1. 현황 — 실모드에서 비어 있는 것과 그 이유

| 표면 | mock 의존 | 실 BE 표면 | 상태 |
|---|---|---|---|
| 일·주·월 블록 그리드 | ~~weekView·monthView~~ | `GET /planner/planners/:id/blocks?date=` | ✅ B4 완료 |
| 주간 학습 시간 그래프(WeeklyChart) | `weeklyStudyHours`(**goal** 포함) | 계획 시간은 블록 파생 가능 · **목표(goal) 표면 없음** | 실모드 숨김 |
| 주간 달성 목표 카드(WeeklyGoalsCard) | goal + `dailyReflection` + `getWeakNodes`(mastery) | **모두 없음** (reflection·weakness BE 미노출) | 실모드 숨김 |
| 월간 진행 카드(MonthlyProgressCard) | goal×4 + `getNextMilestone` + weakNodes | 달성률·D-day는 파생 가능 · 목표·마일스톤·약점 없음 | 실모드 숨김 |
| **블록 완료 기록(쓰기)** | day-view 완료 토글 = mock 로컬 | **쓰기 API 없음** — `block_completions` 는 읽기 전용 조립(`BlockResponseDto.from(b.block, b.completion, …)`)만 존재 | 🔴 **조사 중 발견한 선행 갭** |

BE 컨트롤러 실사(2026-07-03, `pullim-api` origin/dev f18ef8f): planner 모듈군에 `@Post/@Patch` 는
planner CRUD·activate 계열·routines·studygram·`PATCH /me` 뿐. **completion·condition·goal 쓰기 라우트 없음.**

## 2. 트랙 구성 (권장 착수 순서)

### B4b-⓪ 블록 완료 기록 API (BE) — 발견된 선행 작업, 최우선 권고

홈 실화면의 다음 사용자 행동은 "블록 완료 체크"인데 이를 저장할 API가 없다. ①의
완료율·정답률 실값도 전부 이 기록에서 나온다 — **①의 데이터 원천이라 선행**.

- BE: `PATCH /planner/planners/:id/blocks/:blockId/completion` (upsert)
  - body: `{ completed: boolean, accuracy?: number|null, emotion?: string|null, memo?: string|null }`
  - `block_completions` upsert + 소유 검증(플래너 소유자). 과거·오늘 블록만 허용(미래 완료 금지 — 정책 확인 1건).
- api-client: `completeBlock()` 메서드 + 타입.
- FE: day-view 완료 토글 실모드 배선(낙관적 갱신 → 실패 시 롤백 + toast).
- PR: BE 1 → api-client 1 → FE 1 (최상위 룰: 계층 분리).

### B4b-② blocks 기간 API 최적화 (BE+FE) — 작고 명확, 두 번째

현재 훅이 월간 뷰에서 **날짜당 1요청 × 최대 31개 병렬**을 쏜다(주간 7개). 동작은 하나
요청 폭이 크고 모바일에서 느리다.

- BE: `BlocksQueryDto` 에 `from`/`to` 추가(기존 `date` 와 상호배타, 최대 31일 range 가드)
  → 응답을 `{ date, blocks[] }[]` 또는 flat+date 필드로 반환. 기존 `?date=` 계약은 그대로
  유지(하위호환 — 배포 순서 자유).
- api-client: `blocksRange(plannerId, from, to)`.
- FE: `use-home-blocks.ts` 를 기간 1요청으로 교체(부분 실패 처리 단순화 — 요청 1개라
  성공/실패 이분).
- PR: BE 1 → api-client 1 → FE 1.

### B4b-③ 주간 그리드 → 일간 날짜 딥링크 (FE 단독) — 병행 가능

Codex #110 R2에서 합의한 후속. 현재 일간 offset이 `HomeContainer` 의 `useState` 라
URL로 특정 날짜 일간 뷰를 열 수 없다(주간 그리드 요일 클릭이 toast 안내에 그침).

- `HomeContainer`: offset 소스를 URL search param 으로 승격 — `?view=day&date=YYYY-MM-DD`
  (실모드는 `todayIso` 기준, mock 모드는 `planBaseDate` 기준으로 offset 환산).
  - 주의: 현재 "뷰 변경 시 offset 리셋" effect 가 URL 소스로 바뀌면 자연 소멸 — 회귀
    테스트(뷰 전환 시 이전 offset 잔존 버그 #110 이전 이력) 유지.
- `week-grid.tsx` `openDay`: 실모드 비오늘 요일 → `router.push('/planner?view=day&date=…')`
  로 교체(현 요약 toast 제거). mock 모드는 기존 동작 유지.
- month-heatmap 날짜 셀도 동일 딥링크 적용 검토(같은 PR, 작으면 포함).
- PR: FE 1개. BE 무관 — ⓪·②와 독립이라 **병행 가능**.

### B4b-① 블록 외 위젯 실 표면 연동 (BE+FE) — 가장 큼, 마지막

숨겨둔 위젯 3종을 실값으로 되살린다. 단 위젯이 요구하는 수치의 **원천이 제각각**이라
쪼개서 간다:

| 수치 | 원천 | 작업 |
|---|---|---|
| 주간 계획/완료 시간·완료율 | 블록(이미 실값) + ⓪ 완료 기록 | FE 파생만 — `home-data.ts` 확장 |
| 정답률 | `block_completions.accuracy` (⓪이 쓰기 개통) | blocks 응답에 이미 노출 — FE 집계만 |
| **주간 목표 시간(goal)** | **없음** — 결정 필요(§4-A) | BE 표면 신설 또는 플래너 설정 파생 |
| 약점(weakness)·mastery | curriculum 진도 — BE 미노출 | **범위 밖 보류**(리포트 트랙과 함께) |
| 마일스톤·리플렉션 | daily_condition·reflection — BE 미노출 | **범위 밖 보류** |

- 1단계(FE만): WeeklyChart 를 "실 블록 파생값만으로" 복원 — 계획 시간 막대 + 완료 시간
  오버레이(목표선 없음, B4 정직성 원칙 유지). WeeklyGoalsCard·MonthlyProgressCard 는
  실값 가능한 행(완료율·D-day·달성 일수)만 남긴 **실모드 축소판**으로 복원.
- 2단계(goal 결정 후): 목표선·달성률 복원.
- PR: FE 1(1단계) → [goal 결정] → BE 1 + api-client 1 + FE 1(2단계).

## 3. 순서 요약과 근거 (§0 개정으로 대체 — 아래는 의존 관계 참고용)

```
[BE 핸드오프] ⓪ 완료 기록 API   ← ①의 데이터 원천 + 실모드 핵심 UX 공백
[BE 핸드오프] ② 기간 API 확장   ← 요청 31→1
[AI·FE]      ③ 날짜 딥링크     ← BE 무관 — 즉시 가능
[AI·FE]      ① 위젯 1단계 축소 복원 (블록 파생값만) → [BE 핸드오프] goal 후 2단계
```

- BE PR은 pullim-api, FE PR은 pullim-planner — **한 PR에 FE/BE 혼합 금지**(최상위 룰).
- BE 파트는 §0 제약 ①에 따라 담당 개발자 직접 수행. 참고로 ⓪·② 모두 **스키마 변경
  없음**(기존 테이블·컬럼만 사용) — ①-2단계 goal 신설 시에만 마이그레이션.

## 4. 결정 필요 (착수 전 사용자 확인)

- **A. 주간 목표 시간의 소스** (①-2단계 게이트):
  1. *파생* — 플래너 설정(평일·주말 학습 시간대)에서 "계획 가능 시간"을 목표로 계산.
     BE 변경 없음, 즉시 가능. 단 "목표=설정"이라 사용자가 별도 목표를 못 세움.
  2. *신설* — 사용자 입력 주간 목표(시간) 필드를 planner 에 추가(컬럼 1개 + PATCH 허용).
     마이그레이션 1건 필요(게이트키퍼 게이트).
- **B. 미래 블록 완료 금지 여부** (⓪): 미래 날짜 블록의 완료 체크를 400으로 막을지,
  허용할지(선행 학습 케이스). 권고: **오늘까지만 허용**(정직한 기록 원칙).
- **C. ③에서 month-heatmap 날짜 딥링크 포함 여부**: 포함 권고(같은 메커니즘, diff 소폭).

## 5. 검증 기준

- ⓪: seed 계정으로 완료 PATCH → `GET blocks` 응답 `completed=true`·accuracy 반영,
  타 사용자 블록 403/404, e2e(Fake repo) + dev 실검증.
- ②: 월간 1요청으로 B4 검증 스크립트(scratchpad `verify-b4.ts` 패턴) 동일 결과, 31일 초과 range 400.
- ③: `?view=day&date=` 직접 진입·주간 그리드 클릭·뷰 전환 offset 리셋 회귀 테스트(Jest).
- ①: 실모드 홈 주간에 그래프·카드 복원되고 **mock 수치(약점·리플렉션·목표) 미노출** 확인.
- 공통: 각 PR Codex 수렴 + CI conclusion SUCCESS 확인 후 머지.
