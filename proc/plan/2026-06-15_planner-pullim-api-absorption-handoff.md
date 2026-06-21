# 2026-06-15 — planner → pullim-api 흡수 핸드오프 (서비스 카드)

> **성격**: 이 문서는 **pullim-api 리포에 드롭인**할 "planner 서비스 카드"의 핸드오프다.
> pullim-api 코드는 **아직 건드리지 않는다**(진행 중 작업과 충돌 회피). pullim-api 가
> design-first(6뷰 SoT) 프로세스이므로, 착수 시 §3 설계 산출물을 먼저 올리고 §4~§6 으로
> 코드·스키마를 배선한다. 결정은 모두 확정 상태(§1).
>
> **권위 소스**: planner 도메인 스키마 정의 = `pullim-planner/apps/backend/src/entities/*`.
> pullim-api 패턴 = `pullim-api/src/q/*`(q 서비스, 작동 템플릿) + `docs/design/_platform/*`.

## 목표

`pullim-planner`(학습 플래너)를 별도 인증·별도 BE로 운영하던 구조에서, **pullim-api 모놀리식의
`planner` 서비스 모듈**로 흡수한다. 인증/검증/인가/엔타이틀먼트는 pullim-api 공통 커널을
소비하고, planner 도메인(시간표·블록·컨디션·번아웃 등)만 `planner` 스키마로 보유한다.

**완료 기준**
- `pullim-api/src/planner/` 모듈이 도메인 8테이블 + 라우트 `/planner/*` 보유, `JwtVerifyGuard` +
  `EntitlementGuard('planner')` 로 보호.
- 공유 Aurora RDS 에 `planner` 스키마 + 마이그레이션. planner 자체 `auth_*`·DB 폐기.
- 엔타이틀먼트 `flags['planner']` 발급·검증 동작(가격 매트릭스에 이미 존재 — §5.1).
- planner FE 가 자체 로그인 폐기 → 중앙 로그인(`os.pullim.ai`) + 공통 쿠키, api-client 가
  `api.pullim.ai/planner/*` 호출.
- `docs/design/services/planner/*` 4종 + ADR + config 델타 반영, CI design-consistency 통과.

---

## 1. 확정 결정 (대화 2026-06-09 ~ 06-15)

| 항목 | 결정 | 근거 |
|---|---|---|
| 통합 방식 | **흡수형 서비스 모듈** (별도 BE 토큰 원격검증 X) | pullim-api ADR-001 모놀리식 + 인프로세스 검증(ADR-003, JWKS 미서빙). q 가 템플릿 |
| DB | **공유 Aurora RDS 의 `planner` 스키마 (옵션 A)** | planner 라이브 DB 가 이미 소멸(데이터 0) → 외부 직결(q/Supabase식, ADR-031)의 "기존 데이터 유지" 이점 무의미. planner 는 우리가 만든 네이티브 서비스 |
| 인증 | pullim-api auth 전면 채택. planner 자체 auth 폐기 | 통합 로그인 = pullim-api 가 IdP |
| 작업 위치 | **pullim-api 리포** | BE 라우트·엔타이틀먼트·스키마·검증 커널이 거기 있음. planner 리포 작업은 흡수 시 폐기될 코드 |
| 오너 합의 | **완료** — planner 를 서비스로 등록 + `flags['planner']` 발급 승인됨 | 사용자 확인(2026-06-15) |
| 타이밍 | pullim-api 진행 중 작업 머지 후 착수. 현재는 핸드오프 문서만 | 직접 접근 시 충돌 |

---

## 2. 폐기 / 이관 매트릭스 (planner 리포 현 자산 기준)

planner 현재 BE(`pullim-planner/apps/backend`)의 테이블은 두 묶음. 흡수 시:

| 현 테이블 | 처리 | 비고 |
|---|---|---|
| `auth_users` | **폐기** | pullim-api `auth.users` 로 대체 |
| `auth_user_providers` | **폐기** | pullim-api `auth.user_auth_providers` (ADR-025) |
| `refresh_token_blacklist` | **폐기** | pullim-api 는 Redis denylist(ADR-016) |
| `users` (DomainUser, 학습 프로필) | **이관** → `planner.user_profile` | 신원(name)은 auth 소유 → 프로필에서 제거, 학습 필드만 유지(§7) |
| `planners` | 이관 → `planner.planners` | |
| `time_blocks` | 이관 → `planner.time_blocks` | |
| `block_completions` | 이관 → `planner.block_completions` | |
| `planner_subject_units` | 이관 → `planner.planner_subject_units` | |
| `daily_conditions` | 이관 → `planner.daily_conditions` | |
| `burnout_snapshots` | 이관 → `planner.burnout_snapshots` | |
| `curriculum_nodes` | 이관 → `planner.curriculum_nodes` | **글로벌 참조 데이터**(userId 없음) — seed |
| `pedagogy_engines` | 이관 → `planner.pedagogy_engines` | **글로벌 참조 데이터** — seed |

데이터 마이그레이션: **실데이터 0** 이므로 데이터 이전 불필요. 스키마·시드만 재생성.

---

## 3. 설계 산출물 — `pullim-api/docs/design/services/planner/`

pullim-api 의 서비스 설계 4종. q(`docs/design/services/q/*`)와 동일 포맷.

### 3.1 `README.md`
- 서비스 개요: 시험까지의 기간을 분 단위 학습 블록으로 설계하는 학생용 학습 플래너.
- 도메인: 플래너(시험·목표·시간대 설정) / 시간표 블록 / 블록 완료 / 일일 컨디션 / 번아웃 스냅샷 / 커리큘럼·교육엔진 참조.
- 외부 연동: 없음(자체 도메인). AI 자동 생성은 후속(현재 mock 시그니처).

### 3.2 `api.md` — 라우트 계약 (prefix `/planner`)
planner 리포의 기존 컨트롤러(`apps/backend/src/modules/planner/controller/*`)를 그대로 이식:

| Method · Path | 설명 | 가드 |
|---|---|---|
| `GET /planner/me` | 현재 사용자 + 활성 플래너 | `JwtVerifyGuard` + `EntitlementGuard('planner',{action:'read'})` |
| `GET /planner/planners` | 내 플래너 목록(active/inactive/archived) | 〃 read |
| `GET /planner/planners/:id/blocks` | 날짜별 블록 | 〃 read + 소유권 |
| `POST /planner/planners` | 생성 | 〃 write |
| `PUT /planner/planners/:id` | 수정 | 〃 write + 소유권 |
| `DELETE /planner/planners/:id` | 삭제 | 〃 write + 소유권 |
| `POST /planner/planners/:id/activate` | 활성 전환(타 플래너 비활성) | 〃 write + per-user lock |
| `POST /planner/planners/:id/archive` · `/unarchive` | 보관/해제 | 〃 write |
| `POST /planner/planners/:id/duplicate` | 복제 | 〃 write |
| `PUT /planner/planners/:id/customization` | 레이아웃/팔레트 저장 | 〃 write |

- **소유권**: 핸들러에서 `planner.userId === user.sub` 확인(아니면 403). 기존 `ownedOrThrow` 로직 그대로.
- **userId 소스**: `@CurrentUser() user: VerifiedUser` 의 `user.sub`(= `auth.users.id`). 기존 `getCurrentUserId(req)`(mock x-user-id) 폐기.

### 3.3 `data-model.md` — `planner` 스키마 (도메인 8테이블 + user_profile)
PK 는 text(UUID 문자열) 유지(기존 정합). FK 는 같은 RDS 라 `planner.*.user_id → auth.users.id`
앱레벨 참조(스키마 분리는 보안경계 아님, ADR-005 — 크로스스키마 FK 는 pullim-api 컨벤션 확인 후 선택).

- **planners**: `id(pk)`, `user_id`, `name`, `exam_type`, `exam_label`, `exam_start_date(date)`, `exam_end_date(date)`, `target_kind`, `target_value`, `weekday_start(int)`, `weekday_end(int)`, `weekend_start(int)`, `weekend_end(int)`, `block_pattern`, `weakness_auto_reflect(bool)`, `motivation_style`, `motto(null)`, `active(bool)`, `archived(bool)`, `customization(jsonb null)`, `created_at`, `updated_at`
- **time_blocks**: `id(pk)`, `planner_id`, `date(date)`, `start_time(time)`, `end_time(time)`, `subject`, `type`, `title`, `linked_feature_slug(null)`, `curriculum_node_id(null)`, `engines(text[])`, `status`, `progress(real)`, `expected_minutes(int)`, `reasoning(null)`, `created_at`, `updated_at`
- **block_completions**: `block_id(pk)`, `completed_at`, `accuracy(int null)`, `emotion(smallint null)`, `notes(null)` — time_block 과 1:1
- **planner_subject_units**: 복합 PK `(planner_id, subject, position(int))`, `unit_label`
- **daily_conditions**: 복합 PK `(user_id, date)`, `level(smallint)`, `reported_at`
- **burnout_snapshots**: 복합 PK `(user_id, date)`, `score(smallint)`, `trend`, `recommend_break(bool)`, `factors(jsonb)` (= `{label,value,unit('h'|'%'|'/5'|'회'),weight,status('good'|'warn'|'bad')}[]`), `computed_at`
- **curriculum_nodes** (글로벌 참조): `id(pk)`, `parent_id(null)`, `subject`, `level(smallint)`, `label`, `position(int)`
- **pedagogy_engines** (글로벌 참조): `id(pk)`, `label`, `principle`, `example`
- **user_profile** (구 `users`/DomainUser, 학습 프로필): `user_id(pk → auth.users.id)`, `grade`, `track`, `school(null)`, `focus_subjects(text[])`, `weekly_hours(int)`, `preferred_study_time`, `joined_at`, `streak_days(int)` — **`name` 제거**(auth.users 소유, ProfileProjection 으로 조회)

### 3.4 `authz.md`
- **L0(서비스 진입)**: `flags['planner'] ≥ 1` (EntitlementGuard). 미포함(0/없음) → 403.
- **L0′(기능 등급)**: 필요 시 `featureRequires.planner.<feature>`(§5.1) — 예: 다중 플래너/AI 자동생성 = 등급 2.
- **L4(리소스)**: planner/블록은 `user_id == sub` 소유 ABAC(핸들러 인라인, CASL 불필요).
- 전역역할/조직/서비스역할(L1~L3): planner 는 학습자 단일 → 토큰 `global_role` 외 추가 로드 없음.

---

## 4. 공유 파일 델타 (pullim-api)

> 충돌 면적이 있는 부분. 착수 시 진행 중 작업 머지 후 반영.

1. **`src/app.module.ts`** — `imports: [..., PlannerModule]` 추가.
2. **`src/common/verify/config/feature-requires.config.ts`** — `FEATURE_REQUIRES.planner = { use: 1, /* multi_planner: 2, ai_generate: 2 */ }`.
3. **엔타이틀먼트 매트릭스(config-catalog §4.3 / code config)** — `entitlementFlags[<package>][<tier>].planner` 등급. ※ 가격정책 예시 매트릭스에 `planner` 가 **이미 포함**돼 있음(예: `[home][pro] = {studio:1, planner:1, q:2,...}`) → 값만 확정.
4. **`docs/design/_platform/authz-matrix.md`** — planner 행(L0~L4) 추가.
5. **`docs/design/_platform/adr.yaml`** — 신규 ADR(초안 §8).
6. **마이그레이션** — `planner` 스키마 생성. `InitSchemas` 가 스냅샷 패턴이므로 **신규 마이그레이션**으로 `CREATE SCHEMA planner` + 도메인 테이블(§6).
7. **`src/main.ts`(prod 외 Swagger)** — planner 스펙 노출(q 패턴 따름, 선택).
8. **`docs/design/README.md`** 서비스 표에 planner 행.

---

## 5. 엔타이틀먼트 매핑 (§5.1)

`flags['planner']` 순서형 등급(ADR-018):
- `0`/없음 = 미포함(차단)
- `1` = 기본(플래너 사용·블록 관리)
- `2` = 풀(예: 다중 플래너, AI 자동 생성 등 — 기능 분기는 `featureRequires` 로)

→ 패키지×티어 매트릭스의 planner 칸 값은 가격정책 문서(`pullim-api/docs/참고/...가격정책...SSO반영...`)
기준으로 확정. (오너 합의 완료 — 구체 수치만 코드 config 에 기입)

---

## 6. 마이그레이션 초안 (planner 스키마 DDL 스케치)

```sql
CREATE SCHEMA IF NOT EXISTS planner;

CREATE TABLE planner.user_profile (
  user_id text PRIMARY KEY,           -- = auth.users.id
  grade text NOT NULL,
  track text NOT NULL,
  school text,
  focus_subjects text[] NOT NULL DEFAULT '{}',
  weekly_hours int NOT NULL,
  preferred_study_time text NOT NULL,
  joined_at timestamptz NOT NULL,
  streak_days int NOT NULL DEFAULT 0
);

CREATE TABLE planner.planners (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  name text NOT NULL,
  exam_type text NOT NULL, exam_label text NOT NULL,
  exam_start_date date NOT NULL, exam_end_date date NOT NULL,
  target_kind text NOT NULL, target_value text NOT NULL,
  weekday_start int NOT NULL, weekday_end int NOT NULL,
  weekend_start int NOT NULL, weekend_end int NOT NULL,
  block_pattern text NOT NULL,
  weakness_auto_reflect boolean NOT NULL DEFAULT false,
  motivation_style text NOT NULL, motto text,
  active boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  customization jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON planner.planners(user_id);

CREATE TABLE planner.time_blocks (
  id text PRIMARY KEY,
  planner_id text NOT NULL,
  date date NOT NULL, start_time time NOT NULL, end_time time NOT NULL,
  subject text NOT NULL, type text NOT NULL, title text NOT NULL,
  linked_feature_slug text, curriculum_node_id text,
  engines text[] NOT NULL DEFAULT '{}',
  status text NOT NULL, progress real NOT NULL DEFAULT 0,
  expected_minutes int NOT NULL, reasoning text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON planner.time_blocks(planner_id, date);

CREATE TABLE planner.block_completions (
  block_id text PRIMARY KEY,
  completed_at timestamptz NOT NULL,
  accuracy int, emotion smallint, notes text
);

CREATE TABLE planner.planner_subject_units (
  planner_id text NOT NULL, subject text NOT NULL, position int NOT NULL,
  unit_label text NOT NULL,
  PRIMARY KEY (planner_id, subject, position)
);

CREATE TABLE planner.daily_conditions (
  user_id text NOT NULL, date date NOT NULL,
  level smallint NOT NULL, reported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE TABLE planner.burnout_snapshots (
  user_id text NOT NULL, date date NOT NULL,
  score smallint NOT NULL, trend text NOT NULL,
  recommend_break boolean NOT NULL, factors jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE TABLE planner.curriculum_nodes (
  id text PRIMARY KEY, parent_id text,
  subject text NOT NULL, level smallint NOT NULL,
  label text NOT NULL, position int NOT NULL DEFAULT 0
);

CREATE TABLE planner.pedagogy_engines (
  id text PRIMARY KEY, label text NOT NULL,
  principle text NOT NULL, example text NOT NULL
);
```

> snake_case 는 pullim-api naming strategy 와 정합. text PK 유지(기존 시드/ID 정합). uuid 타입
> 전환은 선택(기존 ID 보존 필요 없으니 가능하지만, 변경 이득 작음).

---

## 7. 신원/프로필 경계 (ADR-011)

- **신원(계정레벨)** = pullim-api `auth.users` (id·email·name·global_role). planner 는 토큰 `sub`
  로만 사용. planner 가 표시용 이름 필요 시 **ProfileProjection 포트**(auth 소유, in-process)로 조회.
- **학습 프로필(서비스레벨)** = `planner.user_profile` (grade/track/focus_subjects/weekly_hours/
  preferred_study_time/streak_days). planner 소유. → 구 `users.name` 은 제거(중복 제거).
- planner 도메인 테이블의 `user_id` = `sub` 동일 uuid 문자열.

---

## 8. 신규 ADR 초안 (pullim-api `adr.yaml` 에 추가)

```yaml
- id: ADR-0XX            # 착수 시 번호 채번
  title: planner 서비스 신설 — 흡수형 모듈 + 공유 RDS planner 스키마(외부직결 미채택)
  status: proposed
  date: 2026-06-XX
  stacks: [all]
  context: |
    학습 플래너(pullim-planner)를 별도 BE·별도 auth 로 운영하던 것을 통합 로그인 하위로
    흡수한다. q(ADR-031)는 기존 Supabase 데이터 때문에 외부 직결을 택했으나, planner 는
    라이브 DB 가 소멸해 보존할 데이터가 0 이고 우리가 직접 만든 네이티브 NestJS+TypeORM
    서비스다. 외부 직결 vs 공유 RDS 스키마가 결정 항목.
  decision: |
    planner 를 pullim-api 의 흡수형 서비스 모듈(src/planner)로 두고, 도메인 데이터는
    공유 Aurora RDS 의 planner 스키마로 네이티브 정의한다(외부 직결 미채택). 인증/검증/
    인가/엔타이틀먼트는 공통 커널 소비. planner 자체 auth_*·DB 는 폐기.
  consequence: |
    (+) 단일 RDS·단일 검증 경로·user_id 정합 단순. q 같은 별도 DataSource 불필요.
    (+) 데이터 0 이라 마이그레이션 비용 없음.
    (-) planner 도메인이 공유 RDS blast-radius 안에 들어옴(ADR-005 수용 범위).
```

---

## 9. 모듈 배선 레시피 (q 템플릿 기반, 착수 시 체크리스트)

`pullim-api/src/q/*` 를 본떠:

1. `src/planner/planner.module.ts` — feature 모듈 import 만(빈 모듈 사전생성 금지).
2. `src/planner/modules/<feature>/{controller,service,use-cases,infrastructure,interface}/` —
   기존 planner 리포의 controller/use-case/service/repository 로직 이식(소유권 검증 포함).
3. 컨트롤러: `@Controller('planner')` + `@UseGuards(JwtVerifyGuard, EntitlementGuard('planner', {action}))` + `@CurrentUser() user: VerifiedUser`.
4. `src/planner/entities/*.entity.ts` — `@Entity({ schema: 'planner', name: '...' })`.
5. 글로벌 `DatabaseModule` 사용(별도 DataSource 불필요 — q 와 다른 점).
6. 신규 마이그레이션(§6) `src/common/database/migrations/`.
7. `app.module.ts` 에 `PlannerModule` 등록(§4-1).
8. `FEATURE_REQUIRES.planner` + 엔타이틀먼트 매트릭스(§4-2,3).
9. 시드: curriculum_nodes·pedagogy_engines 글로벌 참조(기존 mock 시드 이식).
10. 테스트: 컨트롤러 e2e(가드 체인 + 소유권 403) + 엔타이틀먼트 게이트.

---

## 10. FE 전환 (planner FE)

흡수 시 planner FE 변경(별 PR, planner 리포):

1. **자체 로그인/가입 폐기** — `app/login`·`app/signup`·`auth-context`·`require-auth` 의 자체
   토큰 부트스트랩 제거. 미인증 시 **중앙 로그인 `os.pullim.ai` 로 리다이렉트**.
2. **쿠키 기반 세션** — pullim-api 회원 토큰은 **HttpOnly 쿠키**(`.pullim.ai`, ADR-010)다.
   현재 planner 의 **localStorage 토큰 + `Authorization: Bearer` 방식 폐기**, `fetch(..., {credentials:'include'})`
   로 전환(회원 토큰을 bearer 로 보내면 pullim-api 가 거부 — §검증 커널).
3. **api-client base** → `https://api.pullim.ai`, 라우트 `/planner/*`, 세션확인 `/auth/me`.
4. ⚠️ **FE 도메인** — 공통 쿠키(`.pullim.ai`) SSO 가 동작하려면 planner FE 가
   **`*.pullim.ai` 서브도메인**(예: `planner.pullim.ai`)에서 서빙돼야 함. 현 `pullim-planner.vercel.app`
   은 쿠키 도메인 밖 → 도메인 연결 필요(인프라 항목).
5. dev 첫-접근 버튼: 중앙 로그인 흐름에선 의미 축소 — 보류/조정.

---

## 11. 착수 순서 (충돌 회피)

1. (지금) 본 핸드오프 확정. ← **현재 단계**
2. pullim-api 진행 중 작업 머지 대기.
3. pullim-api 에 설계 산출물 PR(§3) — design-consistency 게이트 통과(코드 0, 충돌 거의 없음).
4. ADR + config 델타 PR(§4,§5,§8).
5. `planner` 모듈 + 마이그레이션 코드 PR(§6,§9) — 신규 네임스페이스라 additive.
6. FE 전환 PR(§10, planner 리포) + `planner.pullim.ai` 도메인 연결.
7. planner 리포 BE/auth 폐기(흡수 완료 후).

---

## 12. 잔여 확인 (대부분 합의 완료)

- [x] planner 서비스 등록 + `flags['planner']` 발급 — **오너 합의 완료(2026-06-15)**.
- [ ] `entitlementFlags[*][*].planner` 구체 수치(가격정책 매트릭스에서 확정).
- [ ] 크로스스키마 FK(`planner → auth.users`) 사용 여부 — pullim-api 컨벤션 확인.
- [ ] planner FE 서브도메인(`planner.pullim.ai`) 배정.
- [ ] AI 자동 생성(현 mock)의 등급(`featureRequires.planner.ai_generate`) 정책.
