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
| `GET /planner/me` | 현재 사용자 + 활성 플래너 + 컨디션/번아웃 요약(홈 집계) | `JwtVerifyGuard` + `EntitlementGuard('planner',{action:'read'})` |
| `PATCH /planner/me` | 학습 프로필 upsert(온보딩/수정, 부분) | 〃 write |
| `GET /planner/planners` | 내 플래너 목록(active/inactive/archived) | 〃 read |
| `GET /planner/planners/:id/blocks` | 날짜별 블록 | 〃 read + 소유권 |
| `POST /planner/planners` | 생성 | 〃 write |
| `PUT /planner/planners/:id` | 수정 | 〃 write + 소유권 |
| `DELETE /planner/planners/:id` | 삭제 | 〃 write + 소유권 |
| `POST /planner/planners/:id/activate` | 활성 전환(타 플래너 비활성) | 〃 write + per-user lock |
| `POST /planner/planners/:id/archive` · `/unarchive` | 보관/해제 | 〃 write |
| `POST /planner/planners/:id/duplicate` | 복제 | 〃 write |
| `PUT /planner/planners/:id/customization` | 레이아웃/팔레트 저장 | 〃 write |
| `POST /planner/conditions` (신규) | 일일 컨디션 리포트 — upsert `(user_id,date)` | 〃 write |

- **소유권**: 핸들러에서 `planner.userId === user.sub` 확인(아니면 403). 기존 `ownedOrThrow` 로직 그대로.
- **userId 소스**: `@CurrentUser() user: VerifiedUser` 의 `user.sub`(= `auth.users.id`). 기존 `getCurrentUserId(req)`(mock x-user-id) 폐기.
- **프로필/컨디션 계층(미정 갭 — 구현 전 확정)**: 현 컨트롤러는 `me`·`planners`·`blocks` 만 보유.
  `GET /planner/me` 는 프로필+활성 플래너+컨디션/번아웃 요약을 한 번에 반환하고, 프로필 쓰기는
  `PATCH /planner/me`(부분 upsert, 온보딩이 이걸로 프로필 생성). **일일 컨디션 리포트는 신규
  `POST /planner/conditions`** 로 고정 — body `{ date: 'YYYY-MM-DD', level: 1..5 }`, `(user_id,date)`
  upsert(중복일 갱신), guard write. **번아웃은 서버가 계산하는 파생값이라 쓰기 라우트 없음** —
  `GET /planner/me` 집계의 번아웃 요약으로만 노출(재계산은 컨디션/블록 변경 시 서버 내부 트리거).
  dev 한정 `POST /planner/dev/seed-profile`(프로필 시드, prod 비노출) 존재.
- **`GET /planner/me` 상태코드 계약 고정(세션 판별과 겸용 주의)**: FE 는 이 라우트를 **홈 집계 +
  세션 판별**에 겸용한다. 따라서 코드 의미를 모호함 없이 못박는다 — **`404` 는 "인증됨 + `user_profile`
  행 부재(=온보딩 미시작)" 전용** 신호다. 활성 플래너 없음·컨디션 없음 등 "데이터 없음"은 **`200` +
  빈/널 필드**로 반환하고 `404` 를 쓰지 않는다(아니면 FE 가 정상 사용자를 온보딩으로 오라우팅).
  `401`=비인증, `403`=엔타이틀먼트(`flags.planner`) 미보유.
- **온보딩 상태머신 — 행 존재만으로 판별하지 말 것(자동생성 붕괴 방지)**: `PATCH /planner/me`
  빈-body 자동생성이 곧바로 행을 만들어 "행 존재=온보딩 완료" 게이트는 **즉시 무너진다**(정상
  사용자가 온보딩을 못 빠져나옴/실데이터 미수집). ⇒ 온보딩 완료 권위는 **`user_profile.onboarded_at`
  (nullable)** 로 둔다:
  - `GET /planner/me` 404(행 없음) **또는** payload `onboardedAt == null` → **온보딩 미완** → FE 가
    온보딩으로 라우팅.
  - `onboardedAt != null` → 온보딩 완료(홈 진입). `onboarded_at` 는 온보딩 **명시 완료 액션**에서만
    set(자동생성 시엔 NULL 유지) — 이로써 자동생성과 완료가 분리된다.
  - (현 FE 는 진입 시 빈-body 자동생성+즉시 완료 취급 → 이 게이트 도입 시 "완료 액션에서 onboarded_at
    set" 로 정합. go-live 핸드오프의 "온보딩 프로필 수집 폼" 후속과 연동.)
- **`PATCH /planner/me` 부분 upsert × NOT NULL 컬럼 계약**: 온보딩이 **빈 body 로 최초 생성**하므로,
  `user_profile` 의 모든 NOT NULL 컬럼은 **서버 기본값으로 채워질 수 있어야** 한다(예 `joined_at=now()`,
  `focus_subjects='{}'`, `streak_days=0`). 기본값 없는 NOT NULL(예 `grade`/`track`/`weekly_hours`/
  `preferred_study_time`)은 (i) 서버 기본값을 부여하거나 (ii) 온보딩 폼이 필수 입력으로 수집하도록
  **착수 전 확정**한다. 미확정 시 빈-body 생성이 NOT NULL 위반으로 실패한다.

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
9. **credentialed CORS + CSRF (쿠키 SSO 필수 — 누락 시 FE 로그인 전멸)** — planner FE 는 쿠키
   인증(`Domain=.pullim.ai`)이라 BE 가 (a) **credentialed CORS**: 허용 origin 을 와일드카드(`*`)가
   아닌 명시 목록(`https://planner.pullim.ai`, `https://dev-planner.pullim.ai`, 로컬 dev)으로 두고
   `Access-Control-Allow-Credentials: true`, (b) **CSRF double-submit**: 쿠키 `*-pullim-csrf` +
   `X-CSRF-Token` 헤더 검증 + `GET /auth/csrf` 부트스트랩 — 을 제공해야 한다. FE cutover 가 이미
   이 계약에 의존하며, 별도 CORS 핸드오프를 pullim-api 에 전달함.

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
  user_id text PRIMARY KEY,           -- = auth.users.id (타입은 §6.1(c) — auth.users.id 와 정합)
  -- NOT NULL 이면서 기본값 없는 컬럼(grade/track/weekly_hours/preferred_study_time)은
  -- PATCH /planner/me 빈-body 최초생성(온보딩)을 위해 §3.2 계약대로 서버 기본값 부여 또는
  -- 온보딩 필수입력으로 확정해야 한다. 아래는 합리적 기본값 예시(착수 시 확정).
  grade text NOT NULL DEFAULT '미정',
  track text NOT NULL DEFAULT '미정',
  school text,
  focus_subjects text[] NOT NULL DEFAULT '{}',
  weekly_hours int NOT NULL DEFAULT 0,
  preferred_study_time text NOT NULL DEFAULT '미정',
  joined_at timestamptz NOT NULL DEFAULT now(),
  streak_days int NOT NULL DEFAULT 0,
  onboarded_at timestamptz            -- nullable: 온보딩 완료 시각. NULL=진행중(§3.2 게이트 권위)
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

> ⛔ **위 `CREATE TABLE` 들만으로는 스키마가 불완전하다.** 활성 플래너 불변식·스키마 내 FK 는
> 아래 **§6.1 이 동일 마이그레이션의 필수 구성**이다 — §6.1 을 빠뜨리면 도메인 불변식이 DB 에서
> 강제되지 않는다(앱 레벨 검증만으로는 동시성 하에 깨진다).

### 6.1 불변식·참조 무결성 (DDL 에 반드시 포함 — 위 스케치에서 누락 금지)

위 §6 은 컬럼 스케치라 **상태 불변식과 FK 가 빠져 있다.** 구현 마이그레이션은 아래를 DB 레벨로
강제해야 한다(권위 = `pullim-planner/apps/backend/src/entities/*` 주석 + 마이그레이션).

**(a) 활성 플래너 불변식 — user 당 활성·비보관 1행**
```sql
-- planner.entity.ts: planners_user_active_uniq (active=true·archived=false 1행). partial 조건은
-- TypeORM 데코레이터로 표현 불가 → 마이그레이션이 소유한다.
CREATE UNIQUE INDEX planners_user_active_uniq
  ON planner.planners(user_id) WHERE active AND NOT archived;
```
(activate/archive/unarchive 라우트는 이 불변식 안에서만 active 를 토글한다.)

**(b) planner 스키마 내부 FK — planners 가 aggregate root**
```sql
ALTER TABLE planner.time_blocks
  ADD FOREIGN KEY (planner_id) REFERENCES planner.planners(id) ON DELETE CASCADE,
  ADD FOREIGN KEY (curriculum_node_id) REFERENCES planner.curriculum_nodes(id) ON DELETE SET NULL;
ALTER TABLE planner.block_completions
  ADD FOREIGN KEY (block_id) REFERENCES planner.time_blocks(id) ON DELETE CASCADE;
ALTER TABLE planner.planner_subject_units
  ADD FOREIGN KEY (planner_id) REFERENCES planner.planners(id) ON DELETE CASCADE;
```
(소유 자식 테이블은 `ON DELETE CASCADE`, nullable 참조는 `SET NULL` 이 기본. 정확한 정책은
마이그레이션 소유 — 위는 권장 기본값.)

**(c) user 스코프 테이블의 신원 참조** — `user_profile`·`daily_conditions`·`burnout_snapshots`·
`planners.user_id` 는 `auth.users(id)` 를 가리킨다. **스키마 경계를 넘는 cross-schema FK 를 실제로
걸지(물리 FK) 논리 참조만 둘지는 §7(신원/프로필 경계, ADR-011) 결정에 위임**한다.
⚠️ 단 **`user_id` 의 타입을 `auth.users.id` 와 정합**시켜 두어야 그 선택이 열린다 — 현 §6 DDL 은
`user_id text` 인데 `auth.users.id` 가 `uuid` 면 타입 불일치로 cross-schema FK/`ON DELETE CASCADE`
를 **나중에 못 건다**(되돌리려면 데이터 마이그레이션 필요). 착수 전 `auth.users.id` 타입을 확인해
`user_id` 를 맞추거나(uuid↔uuid), `text` 고정의 트레이드오프(물리 FK 영구 포기)를 명시 수용한다.

**(d) auth 사용자 삭제 시 planner 데이터 정리 전략 (착수 전 확정)** — (c) 가 **물리 FK 가 아닌
앱레벨 참조**면 `auth.users` 삭제가 planner 데이터를 자동 정리하지 않는다. ⇒ 정리 전략을 확정해야
한다: 사용자 삭제 이벤트에 `planner.{user_profile, planners(+자식 FK cascade), daily_conditions,
burnout_snapshots}` 를 앱레벨/이벤트로 purge 하거나, cross-schema `ON DELETE CASCADE` 채택(§7/
ADR-011 결정과 연동). **미확정 시 고아 데이터·개인정보 삭제 누락(탈퇴 시 잔존) 위험.**

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
3. 컨트롤러 + prefix: **리소스별 컨트롤러를 그대로 유지**한다 — `@Controller('me')`·
   `@Controller('planners')`(기존 planner 리포와 동일) + 신규 `@Controller('conditions')`
   (§3.2 `POST /planner/conditions`). `/planner` 는 **컨트롤러명에 넣지 않고 모듈 마운트 레벨에서
   부여**한다(`RouterModule.register([{ path: 'planner', module: PlannerModule }])` 또는 동등).
   ⇒ 최종 경로 `/planner/me`·`/planner/planners/*`·`/planner/conditions`(§3.2 와 일치).
   ⚠️ `@Controller('planner')`(단수 단일 컨트롤러)로 바꾸면 §3.2 의 리소스 경로와 어긋나고
   `/planner/planner` 식 중복/누락이 생기므로 **금지**. 가드는 각 컨트롤러에
   `@UseGuards(JwtVerifyGuard, EntitlementGuard('planner', {action}))` + `@CurrentUser() user: VerifiedUser`.
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
   - **CSRF double-submit (쓰기 요청 필수 — §4-9 BE 계약과 짝)** — 쿠키 세션이라 BE 가 CSRF 를
     요구한다. FE 는 (a) 앱 부트스트랩 시 `GET /auth/csrf` 로 CSRF 쿠키(`*-pullim-csrf`)를 받고
     (토큰 캐시 + single-flight), (b) **모든 변경 요청(POST/PUT/PATCH/DELETE)에 그 토큰을
     `X-CSRF-Token` 헤더로 전파**한다. 누락 시 세션 전환 후 쓰기(`PATCH /planner/me` 온보딩
     프로필 생성 포함)가 403 으로 실패한다. ⇒ api-client 래퍼에 부트스트랩+헤더 주입을 내장.
3. **api-client base** → `https://api.pullim.ai`, 라우트 `/planner/*`, 세션확인 `/planner/me`
   (200=인증, 401=비인증, 403=엔타이틀먼트 미보유, 404=온보딩 미완).
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
