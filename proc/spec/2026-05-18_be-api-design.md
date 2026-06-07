# 풀림 플래너 — BE 설계 spec (FE mock → BE 정합)

> 2026-05-18 작성 · BE 1차 정합 입력 · PR #16/#17 production 시점 기준
> **2026-05-26 갱신** — BE 구조를 [curea-co/pullim](https://github.com/curea-co/pullim) 패턴으로 차용 (NestJS + TypeORM). 결정 사항 표만 본 갱신에서 반영. §1 entity 모델·§2 schema·§3 endpoint 계약은 의미상 유지하되, 표기 방식(Drizzle DSL → TypeORM entity)은 Phase γ·δ 진행 시 점진 갱신. 마이그레이션 plan: [proc/plan/2026-05-26_pullim-be-adoption.md](../plan/2026-05-26_pullim-be-adoption.md)

## 결정 사항 (2026-05-26 갱신)

| 항목 | 채택 | 이전 결정 | 이유 |
|---|---|---|---|
| 모노레포 | **bun workspaces + turbo** | (없음, 단일 Next.js repo) | pullim 차용 — `apps/{planner,backend}` + `packages/*` 분리, FE↔BE 타입 공유는 `@pullim-planner/types` |
| 로컬 DB | **PostgreSQL 16** | (동일) | Docker image 안정, JSON·array 타입 지원으로 `subjectUnits` 같은 포장과 정합 |
| ORM | **TypeORM 0.3.x** (Data Mapper) | Drizzle | pullim 차용. `BaseRepositoryInterface<T>` / `BaseRepository<T>` 공통 CRUD + 도메인 Repo는 고유 메서드만 추가 |
| API 스타일 | **NestJS 11 — `apps/backend`** | Next.js API routes 단일 repo | pullim 차용. controller / use-cases (Facade) / service / interface / infrastructure 5 layer |
| 인증 | 1차는 mock 사용자 1명 (`student_001`) 고정 — `X-User-Id` 헤더 + fallback. `packages/auth` MockAuthProvider 위에 NestJS Guard | (동일 — 모델 유지) | Ph8 실인증 도입 보류 |
| 마이그레이션 | **typeorm CLI** (`migration:generate` / `migration:run`) | drizzle-kit | pullim 차용. Phase γ에서 첫 마이그레이션 생성 (기존 Drizzle 마이그레이션은 폐기) |
| 응답 envelope | `{ success: true, data }` / `{ success: false, error: { code, message, statusCode } }` — pullim `ResponseInterceptor` + `HttpExceptionFilter` 차용 | `{ data }` / `{ error: { code, message, details? } }` (raw) | plan §6.2 envelope 분석 — 옵션 A 자동 채택 |
| 에러 코드 | `ErrorMessages` 상수 (`COMMON_VALIDATION_FAILED` / `PLANNER_NOT_FOUND` 등) | lowercase snake 5종 (`not_found` 등) | pullim 컨벤션. Phase β에서 `apps/backend/src/common/constants/error-messages.constant.ts` 생성 |

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

> ⚠️ **실제 운영 스키마와의 차이 (2026-06-04, Phase γ 확인)** — 아래 요약은 설계 시점 표기이며
> 일부가 실제 Drizzle 빌드 결과와 다르다. **권위는 운영 DB(`pullim_planner`) 실 스키마**이고,
> Phase γ entity·마이그레이션은 거기에 맞춰 `pg_dump --schema-only diff 0` 으로 검증됐다.
> 실제와 다른 점:
> - 모든 `created_at`/`updated_at`/`completed_at`/`reported_at`/`computed_at`/`joined_at` 은
>   `timestamp` 가 아니라 **`timestamptz`(timestamp with time zone)** 다(`information_schema` 확인).
>   따라서 entity 도 `timestamptz` 로 매핑한다(엔티티 `timestamp` 로 내리면 운영 컬럼과 타임존
>   해석이 어긋남).
> - `time_blocks` 에는 아래 요약에 빠진 **`updated_at timestamptz NOT NULL DEFAULT now()`** 가
>   실재한다(엔티티·마이그레이션 모두 포함). 제거하면 fresh DB 가 운영 DB 와 diff ≠ 0 이 된다.

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
| `PUT /api/planners/{id}` | 시간표 수정 (편집 필드 전체 교체) | (builder edit) |
| `DELETE /api/planners/{id}` | 시간표 삭제 (active 차단) | `deletePlanner` |
| `POST /api/planners/{id}/activate` | 활성화 (다른 active=false 트랜잭션) | `activatePlanner` |
| `POST /api/planners/{id}/archive` | 아카이브 | `archivePlanner` |
| `POST /api/planners/{id}/unarchive` | 복원 | (미구현 mock) |
| `POST /api/planners/{id}/duplicate` | 복사본 생성 | `duplicatePlanner` |
| `PUT /api/planners/{id}/customization` | 시간표 꾸미기(레이아웃·팔레트) 저장 | `updatePlannerCustomization` |
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

> **2026-06-05 갱신 (Phase ε 구현 결정)** — 시간표 수정을 `PATCH`(partial) 가 아니라
> **`PUT`(편집 필드 전체 교체)** 로 확정한다. FE 빌더가 편집 시 항상 전체 폼을 로드→제출하므로
> partial-merge 의 모호성(어떤 필드가 의도적 삭제인지 vs 미전송인지)이 없고, 서버 시멘틱이
> 단순해진다. 꾸미기(customization)는 수정 payload 에 섞지 않고 **전용 엔드포인트
> `PUT /api/planners/{id}/customization`** 로 분리한다 — FE 의 꾸미기 탭이 설정 수정과 독립된
> UX 흐름이기 때문. (원안의 `PATCH /planners/{id}` partial + customization 포함 설계를 대체.)

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

## 5. mock → BE 정합 로드맵 (2026-05-26 재진입)

### 5.1 1차 로드맵 (2026-05-18 ~ 2026-05-22 머지 완료) — Drizzle 기반

| Phase | 범위 | 산출물 | 상태 |
|---|---|---|---|
| Ph1 | Schema + Docker + spec | 본 문서, schema.ts, docker-compose.yml, drizzle config | ✅ PR #18 머지 |
| Ph2 | seed 스크립트 — mock data → DB | `scripts/seed.ts` (planner 3건, today blocks 8건 등) | ✅ PR #19 머지 |
| Ph3 | read endpoint 구현 (1차) | `/api/me`, `/api/planners`, `/api/planners/{id}/blocks?date=...` | ✅ PR #24 머지 |
| Ph4 | mutation endpoint — Planner CRUD + activate/archive | `/api/planners` POST/PATCH/DELETE + `/activate` `/archive` 등 6건 | ✅ PR #27 머지 |

→ **2026-05-26 결정**: Ph5 진입 직전, BE 구조를 pullim 패턴으로 차용하기로 결정. Ph1~Ph4 산출물(Drizzle / Next.js API routes / seed)은 **폐기** — 코드는 sunk cost지만 DB 스키마·엔드포인트 계약·seed 데이터는 의미적으로 보존하여 5.2 재진입 로드맵에서 동등하게 재현.

### 5.2 재진입 로드맵 (2026-05-26 ~) — NestJS + TypeORM

세부는 [proc/plan/2026-05-26_pullim-be-adoption.md](../plan/2026-05-26_pullim-be-adoption.md) §5.

| Phase | 범위 | 산출물 |
|---|---|---|
| α | 모노레포 재편 + Drizzle 폐기 + NestJS Hello World | `apps/{planner,backend}`, `packages/{types,api-client,auth}`, root workspace · turbo · tsconfig.base, 기존 BE 자산 폐기 |
| β | pullim common 패턴 차용 | `apps/backend/src/common/{bootstrap,filters,guards,interceptors,decorators}`, MockAuthGuard, `ErrorMessages` 상수 |
| γ | planner entity + 마이그레이션 + seed | `apps/backend/src/entities/*.entity.ts`, TypeORM 마이그레이션 1개(기존 Drizzle 스키마와 pg_dump diff 0), seed |
| δ | read endpoint 3건 이식 | `/api/me`, `/api/planners`, `/api/planners/{id}/blocks` (Ph3 산출물 재현, 응답은 envelope shape) |
| ε | mutation endpoint 이식 | POST/PUT/DELETE/activate/archive/unarchive/duplicate + PUT customization (PUT 전체교체 확정, §3 표 참조) — PR #47 |
| ζ | planner mock 잔여 시그니처 이식 | DailyCondition, BurnoutSnapshot, curriculum, subjectUnits 등 + 관련 read endpoint |
| η | FE → BE 호출 전환 | `@pullim-planner/api-client` 함수 추가 + `apps/planner` 측 mock import 제거 |

### 5.3 보류된 phase (1차 로드맵 Ph8/Ph9 — 재진입 후에도 유보)

- **실인증** (Ph8 원안: NextAuth Google) — 본 차용 결정에서 보류. `packages/auth` MockAuthProvider 위에 `X-User-Id` 헤더 가드만 유지
- **prod DB** (Ph9 원안: Vercel Postgres / Supabase + RLS) — 재진입 로드맵 ζ·η 머지 후 별 plan에서 결정

## 6. 알려진 결정 보류

- **TimeBlock 재계획 history** — Ph5에서 lifecycle table 추가할지 결정. mock은 단일 진실 source, BE는 history 추적 옵션
- **WeeklyReport·MonthlyReport materialized view** — Ph6에서 사용량 본 후 도입. 1차는 on-demand 집계
- **Realtime (블록 진행 push)** — Ph7 이후. 1차는 polling 또는 SWR

## 참고
- mock 도메인 권위: [src/lib/mock/planner.ts](../../src/lib/mock/planner.ts), [persona.ts](../../src/lib/mock/persona.ts), [curriculum.ts](../../src/lib/mock/curriculum.ts)
- 도메인 핸드오프: [input/docs-archive/08_풀림_플래너_핸드오프.md](../../input/docs-archive/08_풀림_플래너_핸드오프.md)
- 화면 역분석: [proc/research/2026-05-18_screen-design-rationale.html](../research/2026-05-18_screen-design-rationale.html)
