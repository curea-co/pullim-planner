# 풀림 플래너 — BE 설계 spec (FE mock → BE 정합)

> 2026-05-18 작성 · BE 1차 정합 입력 · PR #16/#17 production 시점 기준

## 결정 사항

| 항목 | 채택 | 이유 |
|---|---|---|
| 로컬 DB | **PostgreSQL 16** | Docker image 안정, JSON·array 타입 지원으로 `subjectUnits` 같은 포장과 정합. Vercel Postgres·Supabase 이전 쉬움 |
| ORM | **Drizzle** | TypeScript-first, lightweight, SQL에 가까운 표현. schema-as-code → migration CLI |
| API 스타일 | **Next.js API routes 단일 repo** | 현 repo 그대로. `/api/*` route handler. FE·BE 타입 공유 쉬움 |
| 인증 | 1차는 mock 사용자 1명 (`student_001`) 고정 | NextAuth/Clerk 도입은 별 spec |
| 마이그레이션 | **drizzle-kit** generate + push | schema.ts 변경 → `bunx drizzle-kit generate` → SQL diff |

## 1. Entity 모델 (관계도)

```
User (1) ─── (N) Planner (1) ─── (N) PlannerSubjectUnit
                  │
                  └─── (N) TimeBlock (1) ─── (1) BlockCompletion
                  
User (1) ─── (N) DailyCondition
User (1) ─── (N) BurnoutSnapshot
                                                            
CurriculumNode (자기참조 트리)
PedagogyEngine (정적 seed)
```

핵심 도메인:
- **User**: 학생 페르소나 (1명 = 1 row, mock의 `Persona`)
- **Planner**: 여러 시간표 (수능·기말 등 각 사이클별 1 row, mock `Planner`)
- **TimeBlock**: 시간표 안 학습 블록 (mock `TimeBlock`, today/주간/월간 모두 이 한 테이블에서 파생)
- **BlockCompletion**: 블록 결과 — 정답률·감정·실제 시간 (분리 이유는 §1.2)
- **DailyCondition**: 하루 1 row (1~5)
- **BurnoutSnapshot**: 하루 1 row (계산형이지만 cache용으로 저장)
- **CurriculumNode**: 3-Depth 교육과정 트리 (mock `curriculum.ts`)
- **PedagogyEngine**: 7대 학습과학 엔진 (정적, seed)

### 1.1 TimeBlock 시간 정합 — 왜 `date + start/end` 인가

mock의 `start: "HH:MM"` / `end: "HH:MM"`은 *오늘 날짜*가 암묵적. BE에서는 명시적 `date DATE` 컬럼을 추가해 N일치 시간표를 한 테이블에 담는다. start/end는 그 날짜 안의 시각이므로 `time` 타입.

### 1.2 BlockCompletion을 TimeBlock에서 분리한 이유

`accuracy`·`emotion`은 블록 완료 시점에 추가. status를 `done`으로 바꾸면서 동시에 기록. mock에서는 TimeBlock 안 옵셔널 필드지만, BE에서는 분리해 **plan(블록)과 result(완료)의 lifecycle을 명시**한다.

- Plan은 사전 생성, Result는 사후 기록
- Plan 수정 (시간 변경 등) ≠ Result 수정
- 한 블록의 여러 시도(미수행 후 재계획) 추적 가능

### 1.3 customization JSON column

mock `Planner.customization`은 `layoutId / weekLayoutId / paletteId` 3개의 enum-like 값. DB에는 별 컬럼보다 `JSONB` 1개로 두는 게 future field 추가에 강함. (검색·조회는 거의 안 함)

## 2. DB Schema (Drizzle)

[`src/lib/db/schema.ts`](../../src/lib/db/schema.ts) 참조. 핵심 요약:

```ts
users (
  id text PK,                    // 'student_001' 같은 외부 id (mock 호환)
  name text NOT NULL,
  grade text NOT NULL,
  track text NOT NULL,
  school text,
  focus_subjects text[] NOT NULL,
  weekly_hours integer NOT NULL,
  preferred_study_time text NOT NULL,
  joined_at timestamp NOT NULL,
  streak_days integer DEFAULT 0
)

planners (
  id text PK,
  user_id text REFERENCES users.id,
  name text NOT NULL,
  exam_type text NOT NULL,          // 'mock' | 'suneung' | 'midterm' | 'final' | 'other'
  exam_label text NOT NULL,
  exam_start_date date NOT NULL,
  exam_end_date date NOT NULL,
  target_kind text NOT NULL,        // 'grade' | 'score' | 'free'
  target_value text NOT NULL,       // number → text 통합 (free일 때 문자열)
  weekday_start integer NOT NULL,   // 0~23
  weekday_end integer NOT NULL,
  weekend_start integer NOT NULL,
  weekend_end integer NOT NULL,
  block_pattern text NOT NULL,      // 'pomodoro' | 'focused' | 'deep'
  weakness_auto_reflect boolean NOT NULL,
  motivation_style text NOT NULL,   // 'autonomous' | 'guided' | 'spartan'
  motto text,
  active boolean DEFAULT false,
  archived boolean DEFAULT false,
  customization jsonb,              // {layoutId, weekLayoutId?, paletteId}
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
)
-- 한 user당 active=true는 단 한 행 (partial unique index)
CREATE UNIQUE INDEX planners_user_active_uniq ON planners(user_id) WHERE active = true AND archived = false;

planner_subject_units (
  planner_id text REFERENCES planners.id ON DELETE CASCADE,
  subject text NOT NULL,           // 'korean' | 'math' | ... (SubjectKey)
  unit_label text NOT NULL,
  position integer NOT NULL,       // 정렬용
  PRIMARY KEY (planner_id, subject, position)
)

time_blocks (
  id text PK,
  planner_id text REFERENCES planners.id ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject text NOT NULL,           // SubjectKey | 'rest'
  type text NOT NULL,              // BlockType
  title text NOT NULL,
  linked_feature_slug text,
  curriculum_node_id text REFERENCES curriculum_nodes.id,
  engines text[] NOT NULL,         // PedagogyEngineId[]
  status text NOT NULL,            // 'todo' | 'doing' | 'done' | 'skipped'
  progress real NOT NULL DEFAULT 0,// 0~1
  expected_minutes integer NOT NULL,
  reasoning text,
  created_at timestamp NOT NULL DEFAULT now()
)
CREATE INDEX time_blocks_planner_date ON time_blocks(planner_id, date);

block_completions (
  block_id text PK REFERENCES time_blocks.id ON DELETE CASCADE,
  completed_at timestamp NOT NULL,
  accuracy integer,                 // 0~100
  emotion smallint,                 // 1~5
  notes text
)

daily_conditions (
  user_id text REFERENCES users.id,
  date date NOT NULL,
  level smallint NOT NULL,         // 1~5
  reported_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
)

burnout_snapshots (
  user_id text REFERENCES users.id,
  date date NOT NULL,
  score smallint NOT NULL,         // 0~100
  trend text NOT NULL,             // 'rising' | 'stable' | 'falling'
  recommend_break boolean NOT NULL,
  factors jsonb NOT NULL,          // BurnoutFactor[]
  computed_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
)

curriculum_nodes (
  id text PK,                       // 'math.calc.diff.application'
  parent_id text REFERENCES curriculum_nodes.id,
  subject text NOT NULL,
  level smallint NOT NULL,          // 1=과목, 2=단원, 3=세부
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0
)

pedagogy_engines (
  id text PK,                       // 'spaced_repetition'
  label text NOT NULL,
  principle text NOT NULL,
  example text NOT NULL
)
```

## 3. REST API Endpoint 표

| Method · Path | 설명 | mock 함수 매핑 |
|---|---|---|
| `GET /api/me` | 현재 사용자(페르소나) | `currentPersona` |
| `GET /api/planners` | 시간표 목록 (active/inactive/archived 함께) | `getPlanners` |
| `POST /api/planners` | 빌더 결과로 새 시간표 생성 | (builder commit) |
| `GET /api/planners/{id}` | 시간표 1건 | `findPlanner` |
| `PATCH /api/planners/{id}` | 시간표 수정 (모든 필드 partial) | (builder edit) |
| `DELETE /api/planners/{id}` | 시간표 삭제 (active 차단) | `deletePlanner` |
| `POST /api/planners/{id}/activate` | 활성화 (다른 active=false 트랜잭션) | `activatePlanner` |
| `POST /api/planners/{id}/archive` | 아카이브 | `archivePlanner` |
| `POST /api/planners/{id}/unarchive` | 복원 | (미구현 mock) |
| `POST /api/planners/{id}/duplicate` | 복사본 생성 | `duplicatePlanner` |
| `GET /api/planners/{id}/blocks?date=YYYY-MM-DD` | 해당 날짜 블록 (오늘 default) | `todayBlocks` |
| `GET /api/planners/{id}/blocks?from=...&to=...` | 주간·월간 조회 | `weekView`, `monthView` |
| `POST /api/planners/{id}/blocks` | 블록 추가 (재계획·이월 등) | (mock skip) |
| `PATCH /api/blocks/{id}` | 진행 상태 갱신 (status·progress) | (BlockCard CTA) |
| `POST /api/blocks/{id}/complete` | 완료 기록 (BlockCompletion 생성) | (BlockCompleteDialog) |
| `GET /api/conditions/today` | 오늘 컨디션 | `todayCondition` |
| `POST /api/conditions` | 오늘 컨디션 보고 | `ConditionSlider` 제출 |
| `GET /api/burnout/today` | 오늘 번아웃 스냅샷 | `todayBurnout` |
| `POST /api/burnout/recompute` | 강제 재계산 (debug용) | — |
| `GET /api/reports/day?date=...` | 일일 회고 메트릭 | `dailyReflection` |
| `GET /api/reports/week?week=...` | 주간 메트릭 | `weekView` 집계 |
| `GET /api/reports/month?month=...` | 월간 메트릭 | `monthView` 집계 |
| `POST /api/reports/parent` | 부모 보고 전송 (동의 후) | `ConsentDialog` 제출 |
| `GET /api/curriculum?subject=math` | 과목별 단원 트리 | `getCurriculum` |
| `GET /api/pedagogy-engines` | 7대 엔진 메타 (정적) | `pedagogyEngineMeta` |

### 3.1 응답 표준

```ts
// 성공
{ data: T }
// 페이지네이션
{ data: T[], pagination: { total, page, perPage } }
// 에러
{ error: { code: string, message: string, details?: object } }
```

### 3.2 표준 에러 코드

- `not_found` (404)
- `validation_failed` (422)
- `conflict` (409) — active 변경 race 등
- `forbidden` (403) — 다른 사용자 planner 접근
- `internal` (500)

### 3.3 인증 (1차)

- Header `X-User-Id: student_001` 또는 cookie 기반 mock session
- 실 도입은 별 spec (NextAuth Google + 학생 가입 가드)

## 4. 로컬 Docker DB

[`docker-compose.yml`](../../docker-compose.yml) 참조. 핵심:

```yaml
postgres:
  image: postgres:16-alpine
  ports: ["5432:5432"]
  environment:
    POSTGRES_USER: pullim
    POSTGRES_PASSWORD: pullim_local
    POSTGRES_DB: pullim_planner
  volumes:
    - ./.docker/postgres:/var/lib/postgresql/data
```

`.env.local`:
```
DATABASE_URL=postgres://pullim:pullim_local@localhost:5432/pullim_planner
```

명령:
```bash
docker compose up -d            # DB 시작
docker compose down             # DB 종료 (데이터 유지)
docker compose down -v          # 볼륨 삭제 (clean)
bunx drizzle-kit generate       # schema → SQL diff 생성
bunx drizzle-kit migrate        # migration 적용
bunx drizzle-kit studio         # 웹 UI로 테이블 확인 (localhost:4983)
bun run db:seed                 # mock data → DB seed (선택)
```

## 5. mock → BE 정합 로드맵 (별 plan)

| Phase | 범위 | 산출물 |
|---|---|---|
| **Ph1 (이번)** | Schema + Docker + spec | 본 문서, schema.ts, docker-compose.yml, drizzle config |
| Ph2 | seed 스크립트 — mock data → DB | `scripts/seed.ts` (planner 3건, today blocks 8건 등) |
| Ph3 | read endpoint 구현 (1차) | `/api/me`, `/api/planners`, `/api/planners/{id}/blocks?date=...` |
| Ph4 | mutation endpoint — Planner CRUD + activate/archive | `/api/planners` POST/PATCH/DELETE + `/activate` `/archive` |
| Ph5 | block lifecycle | `/api/blocks/{id}` PATCH + `/complete` |
| Ph6 | condition·burnout·report 집계 | DailyCondition, BurnoutSnapshot, /api/reports/* |
| Ph7 | FE → API 교체 | mock 함수 → fetch (`src/lib/api/`) 점진 교체 |
| Ph8 | 인증 | NextAuth Google + 학생 가입 흐름 |
| Ph9 | prod DB | Vercel Postgres 또는 Supabase, drizzle push 또는 migration CI |

## 6. 알려진 결정 보류

- **TimeBlock 재계획 history** — Ph5에서 lifecycle table 추가할지 결정. mock은 단일 진실 source, BE는 history 추적 옵션
- **WeeklyReport·MonthlyReport materialized view** — Ph6에서 사용량 본 후 도입. 1차는 on-demand 집계
- **Realtime (블록 진행 push)** — Ph7 이후. 1차는 polling 또는 SWR

## 참고
- mock 도메인 권위: [src/lib/mock/planner.ts](../../src/lib/mock/planner.ts), [persona.ts](../../src/lib/mock/persona.ts), [curriculum.ts](../../src/lib/mock/curriculum.ts)
- 도메인 핸드오프: [input/docs-archive/08_풀림_플래너_핸드오프.md](../../input/docs-archive/08_풀림_플래너_핸드오프.md)
- 화면 역분석: [proc/research/2026-05-18_screen-design-rationale.html](../research/2026-05-18_screen-design-rationale.html)
