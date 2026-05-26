# 2026-05-26 — pullim BE 구조 차용 (Drizzle → NestJS+TypeORM 완전 대체)

## 목표

이 리포(`pullim-planner`)를 [curea-co/pullim](https://github.com/curea-co/pullim) 의 모노레포 패턴으로 재편하고, 현재까지 누적된 planner mock 시그니처 전체(`src/lib/mock/planner.ts` · `persona.ts` · `curriculum.ts` · `family.ts` · `features.ts` · `subscriptions.ts`)를 NestJS + TypeORM BE로 이식한다. pullim 플랫폼과의 SaaS 통합(현 시점에는 동일 BE 구조 공유까지)이 종착점.

**완료 기준** (이 plan 전체):
- 리포 루트가 `apps/{planner,backend}/` + `packages/{types,api-client,auth,...}/` 로 재편
- `apps/backend/src/modules/planner/` 가 mock 시그니처 전체에 대응하는 entity / repository / service / use-case / controller 보유
- `apps/planner/` FE는 `@pullim/api-client` 만 import (mock 직접 import 0건)
- `proc/spec/2026-05-18_be-api-design.md` 갱신: 채택 ORM·API 스타일·디렉토리 구조 매트릭스를 새 결정으로 교체
- CLAUDE.md / AGENTS.md / README.md 가 새 모노레포 구조를 반영

---

## 1. 배경 — 사용자 4결정 + 발견 사항

### 1.1 사용자 결정 (2026-05-26 대화)

| 항목 | 결정 | 비고 |
|---|---|---|
| 흡수 방식 | **옵션 1 — 풀 흡수** (`apps/planner` + `apps/backend`) | pullim 차용 옵션 3안 중 1번 |
| 스코프 | **planner 핵심 mock 전체 BE 이식** | 단일 PR 불가 → 다단 PR 분할 (§5) |
| BE 도메인 | **planner만** (인증은 `packages/auth` MockAuthProvider) | pullim의 user/auth/workbook/lecture/payment/faq/notice 미차용. Ph8(실인증)·Ph9(RLS) 보류 |
| 패키지 매니저 | **bun 유지 + workspace만 채택** | pullim은 pnpm — 이 항목만 분기. NestJS의 bun 호환성은 §6 리스크 |
| 기존 BE 자산 | **완전 대체** | Drizzle / `src/lib/db/` / `src/app/api/` / `drizzle/` / `scripts/seed.ts` 폐기. DB 스키마·엔드포인트 계약·seed 데이터는 의미적으로 보존 |

### 1.2 발견 — 이 리포의 현재 BE 상태

`proc/archive/2026-05-22_be-phase-4.md` 머지(PR #27)까지 진행됨:

| Phase | 산출물 | 머지 PR |
|---|---|---|
| Ph1 | Postgres docker-compose + Drizzle schema | #18 |
| Ph2 | seed (`student_001` + 7일치 planner mock) | #19 |
| Ph3 | read endpoint 3건 (`/api/me`, `/api/planners`, `/api/planners/[id]/blocks`) | #24 |
| Ph4 | mutation endpoint 6건 (CRUD + activate/archive/unarchive/duplicate) + validation helper | #27 |

현재 동작 중인 endpoint (`src/app/api/`):
- `GET /api/me`
- `GET /api/planners`, `POST /api/planners`
- `GET /api/planners/[id]`, `PATCH /api/planners/[id]`, `DELETE /api/planners/[id]`
- `GET /api/planners/[id]/blocks`
- `POST /api/planners/[id]/activate`
- `POST /api/planners/[id]/archive`, `POST /api/planners/[id]/unarchive`
- `POST /api/planners/[id]/duplicate`

인증 모델: `getUserId(req)` — `X-User-Id` 헤더 → fallback `student_001`. pullim 차용 후에도 **같은 인증 모델**(MockAuthProvider 추상화 위에 헤더 가드).

### 1.3 pullim에서 차용할 BE 구조 (요지)

상세 분석은 본 대화 1회차 — 핵심만:

- **모노레포**: pnpm + Turbo → 본 리포에서는 **bun workspace + Turbo**로 분기
- **NestJS 11**: 도메인 모듈 = controller / use-cases (Facade) / service / interface / infrastructure
- **TypeORM**: entity 중앙 관리(`src/entities/`) + `BaseRepositoryInterface<T>` / `BaseRepository<T>` 공통 CRUD
- **common**: bootstrap(setupGlobal/Security/Logging/Swagger) / filters / 전역 가드 / interceptors / dto / validation-messages / decorators / swagger
- **Cls + Redis + JWT**: 본 차용에서 **Cls만 채택, Redis·JWT는 보류** (planner only + Mock auth)
- **packages**: `types` (BE↔FE 공유) / `api-client` (fetch 래퍼) / `auth` (`IAuthProvider` 추상화) — 본 차용 1차 셋

---

## 2. 비목표 (scope out)

- pullim의 user / workbook / lecture / payment / faq / notice 도메인 미차용
- 실인증 (NextAuth / Passport JWT / Refresh Token) 미도입 → Mock 헤더 인증 유지
- RLS / Supabase 미도입 (로컬 Postgres + TypeORM)
- Redis · BullMQ · 외부 큐 미도입
- pullim의 `apps/web` / `apps/studio` 미차용 (이 리포는 `apps/planner` 하나)
- pullim의 `packages/{analytics, logging, remote-config, ui}` 미차용 (planner FE가 자체 토큰·UI 보유)
- pullim의 docs 폴더 컨벤션(`10-인증-인가/` 등 십의 자리 그룹) 미도입 — 본 리포는 `proc/spec/` 유지
- Codex Review 통과 필수 룰은 그대로 적용 (사용자 메모리 [feedback_codex_review_required.md] 기준)

---

## 3. 최종 디렉토리 구조 (after)

```
pullim-planner/
├── apps/
│   ├── planner/                      # ← 현 src/, public/, next.config.ts 등 통째로
│   │   ├── app/(student)/planner/
│   │   ├── components/{planner,planner-manage,planner-builder,builder,shell,brand,ui}/
│   │   ├── lib/{tokens,mock,utils,...}/    # mock은 일단 잔존 (Phase γ까지)
│   │   ├── next.config.ts
│   │   ├── eslint.config.mjs
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── backend/                      # ← NestJS 11 신규
│       ├── src/
│       │   ├── common/{bootstrap,filters,guards,interceptors,decorators,dto,swagger,validation-messages,utils,subscribers,interfaces,infrastructure,constants}/
│       │   ├── config/{database,timezone}.config.ts
│       │   ├── database/{data-source.ts, database.module.ts, migrations/}
│       │   ├── entities/{user.entity.ts, planner.entity.ts, time-block.entity.ts, ...}
│       │   ├── modules/planner/
│       │   │   ├── controller/{planner.controller.ts, blocks.controller.ts, dto/, swagger/}
│       │   │   ├── use-cases/{get-planners, create-planner, activate-planner, ...}.use-case.ts
│       │   │   ├── service/planner.service.ts
│       │   │   ├── interface/planner-repository.interface.ts
│       │   │   ├── infrastructure/planner.repository.ts
│       │   │   └── planner.module.ts
│       │   ├── app.controller.ts
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/
│       ├── nest-cli.json
│       ├── tsconfig.json / tsconfig.build.json
│       ├── eslint.config.mjs
│       └── package.json
├── packages/
│   ├── types/                        # BE↔FE 공유 타입 (TimeBlock, Planner, Persona, ...)
│   │   ├── src/{index.ts, planner.ts, persona.ts, curriculum.ts, family.ts}
│   │   └── package.json
│   ├── api-client/                   # fetch 래퍼 + planner API 함수
│   │   ├── src/{index.ts, planner.ts}
│   │   └── package.json
│   └── auth/                         # IAuthProvider 추상화 + MockAuthProvider
│       ├── src/{index.ts, types.ts, service.ts, providers/mock.ts}
│       └── package.json
├── proc/                             # 그대로
├── input/                            # 그대로
├── daily_outcome/                    # 그대로
├── .github/                          # workflow 경로 갱신
├── docker-compose.yml                # Postgres 그대로 (DB명·credential 유지)
├── package.json                      # workspace root
├── bun.lock
├── turbo.json                        # 신규
├── tsconfig.base.json                # 신규 (apps/packages가 extends)
├── CLAUDE.md                         # 신규 구조 반영
├── AGENTS.md                         # bun workspace + NestJS·Next.js 정보
└── README.md
```

폐기 대상 (Phase α PR에서 제거):
- `drizzle/`, `drizzle.config.ts`
- `src/lib/db/` (`schema.ts`, `index.ts`)
- `src/app/api/` (`_lib/*` 포함)
- `scripts/seed.ts` (apps/backend 측에서 TypeORM seed로 재작성)
- 루트의 `package.json` 내 `db:*` 스크립트 + Drizzle·pg 의존성

---

## 4. 변경점 매트릭스 (CLAUDE.md / spec / scripts / 의존성)

### 4.1 명령어 — bun + workspace 패턴

| 현재 | 변경 후 |
|---|---|
| `bun dev` (포트 3030) | `bun dev` → workspace root에서 turbo dev (또는 `bun --filter @pullim-planner/planner dev`) |
| `bun run build` | `bun run build` (turbo build) |
| `bunx tsc --noEmit && bun run lint` | `bun run typecheck && bun run lint` (turbo) |
| `bun run db:up` | `bun run db:up` (root) — docker-compose 그대로 |
| (없음) | `bun run dev:backend` — `bun --filter @pullim-planner/backend start:dev` |
| (없음) | `bun run migration:generate:backend` 등 TypeORM CLI 래퍼 |

`apps/planner/package.json` name = `@pullim-planner/planner`, `apps/backend/package.json` name = `@pullim-planner/backend`. packages는 `@pullim-planner/{types,api-client,auth}` (pullim은 `@pullim/*` 사용 — 차용처와 충돌 없게 `pullim-planner` 네임스페이스 사용).

### 4.2 CLAUDE.md 갱신 항목

- §1 편집 영역: `src/...` → `apps/planner/...`, 신규 항목 `apps/backend/...`, `packages/{types,api-client,auth}/...`
- §2 공유 영역: tokens·utils·layout 경로 갱신, `apps/backend/src/common/*` 추가 ("플래너 락인에서도 backend common edit은 글로벌 작업")
- §3 락인 컨벤션: "플래너 도메인 BE/FE edit은 자유, 다른 도메인 추가는 글로벌 작업"
- §5 도구 보조: 새 명령 표

### 4.3 권위 spec 갱신 (`proc/spec/2026-05-18_be-api-design.md`)

| 결정 항목 | 현행 | 갱신 |
|---|---|---|
| ORM | Drizzle | **TypeORM 0.3.x** (Data Mapper) |
| API 스타일 | Next.js API routes 단일 repo | **NestJS 11 — apps/backend** (모노레포 분리) |
| 마이그레이션 | drizzle-kit | **typeorm migration:generate** |
| 디렉토리 | `src/lib/db/`, `src/app/api/` | `apps/backend/src/{entities, modules, common, database}` |
| 인증 1차 | mock `student_001` (`X-User-Id` 헤더) | **유지** (Mock 그대로) — `@pullim-planner/auth` MockAuthProvider 추상화 추가 |
| Phase 로드맵 (§5) | Ph1~Ph9 | **재진입**: Ph1~Ph4 결과물은 pullim 패턴으로 재작성 → §5 Ph1' 시작점. Ph8/Ph9는 유보. |

### 4.4 의존성 변경 (`apps/backend/package.json`)

추가:
- `@nestjs/{common, core, platform-express, config, typeorm, swagger, jwt, passport}` (jwt/passport는 추상화 호환용 — Mock 가드 위에 얹는 정도)
- `typeorm`, `pg`, `class-validator`, `class-transformer`, `nestjs-cls`, `reflect-metadata`
- dev: `@nestjs/cli`, `@nestjs/testing`, `@types/express`, `@types/node`, `ts-node`, `tsconfig-paths`

루트에서 제거 (apps/planner는 유지):
- `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg`

### 4.5 PR 머지 정책

- 매 PR Codex Review 통과 필수 (사용자 메모리 룰)
- 머지 후 production 자동 배포 금지 (사용자 메모리 룰) — PM 명시 슬롯에서만
- 각 Phase PR 머지 시 본 plan 파일에 진척 체크 추가, 전체 완료 시 `proc/archive/`로 이동 (사용자 명시 시점에)

---

## 5. PR 분할 (제안 — 7개 단계)

각 단계는 독립 PR로 머지 가능하며, 이전 단계 머지 → 다음 단계 진입.

### Phase α — 모노레포 재편 + Drizzle 자산 폐기 (1 PR)

**목표**: 동작 회귀 없이 구조만 재편.

- `apps/planner/` 생성, 기존 `src/`, `public/`, `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `instrumentation.ts`(있다면), `messages/` 등을 모두 이동
- `apps/backend/` 빈 NestJS 부팅 (Hello World controller만)
- `packages/{types,api-client,auth}/` 빈 패키지 스캐폴딩 (`src/index.ts` exports만)
- bun workspace 셋업 (`package.json` workspaces 필드)
- `turbo.json` 신규 + `tsconfig.base.json` 신규
- **폐기**: `drizzle/`, `drizzle.config.ts`, `src/lib/db/`, `src/app/api/`, `scripts/seed.ts`, 루트 `package.json` 의 `db:*` 스크립트 일부 (`db:up/down/reset`는 root에 잔존)
- CLAUDE.md / AGENTS.md / README.md 갱신
- **완료 기준**: `bun dev` (planner) 및 `bun dev:backend` (NestJS hello) 모두 정상 부팅. 기존 `/planner` 라우트 회귀 0 — `proc/knowhow/2026-05-15_reports-analytics-direction.md` 류의 시각 단서 변동 없음. spec 문서 §1·§5 갱신 패치 동봉.

### Phase β — pullim common 패턴 차용 (1 PR)

**목표**: pullim의 common 인프라를 그대로 복제 (planner module 진입 전 토대).

- `apps/backend/src/common/` 전부 — bootstrap(setupGlobal/Security/Logging/Swagger), filters(AllExceptionsFilter / HttpExceptionFilter), interceptors(ResponseInterceptor), decorators, dto(common), validation-messages, swagger, utils, interfaces(BaseRepositoryInterface), infrastructure(BaseRepository)
- `apps/backend/src/config/` (database, timezone, swagger)
- `apps/backend/src/database/` (data-source.ts, database.module.ts, migrations/ 빈 폴더)
- nestjs-cls 글로벌, AllExceptionsFilter + HttpExceptionFilter + ResponseInterceptor 전역 등록
- `MockAuthGuard` (`X-User-Id` 헤더 → fallback `student_001`) — pullim `JwtAuthGuard` 패턴, 다만 mock 검증만
- `RolesGuard`는 차용하되 비활성 (planner 단일 사용자 모델)
- **완료 기준**: NestJS 부팅 시 Swagger `/api-docs` 노출, 임의 throw → AllExceptionsFilter 응답 일관, `X-User-Id` 헤더 가드 동작.

### Phase γ — planner 도메인 entity 설계 + 마이그레이션 1개 (1 PR)

**목표**: mock 시그니처 ↔ TypeORM entity 매핑 매트릭스 + 첫 마이그레이션.

- `apps/backend/src/entities/`:
  - `user.entity.ts` (mock `Persona` 시그니처)
  - `planner.entity.ts` (Drizzle `planners` 테이블 그대로 — uniqueIndex `(userId) WHERE active = true` 포함)
  - `time-block.entity.ts`
  - `block-completion.entity.ts`
  - `planner-subject-unit.entity.ts`
  - `daily-condition.entity.ts`
  - `burnout-snapshot.entity.ts`
  - `curriculum-node.entity.ts` (자기참조 트리)
  - `pedagogy-engine.entity.ts`
- DB 스키마는 **현 Drizzle schema와 비트단위 동일**하게 도출 (`pg_dump` diff 검증)
- TypeORM 마이그레이션 1개 생성 (raw SQL은 기존 `drizzle/0000_woozy_forgotten_one.sql` 와 동등)
- seed: pullim의 seed 패턴은 없으므로 `apps/backend/src/database/seeds/` 신설, 기존 `scripts/seed.ts` 의 데이터를 TypeORM repo로 재작성
- **완료 기준**: `bun migration:run:backend` → 기존 Drizzle 스키마와 `pg_dump --schema-only` diff 0. seed 실행 시 `users` 1행 + `planners` n행 + `time_blocks` m행이 기존 동등.

### Phase δ — planner read endpoint 3건 이식 (1 PR)

- `apps/backend/src/modules/planner/`:
  - `MeController` (`GET /api/me`)
  - `PlannerController` (`GET /api/planners`)
  - `BlocksController` (`GET /api/planners/:id/blocks`)
  - `GetMeUseCase`, `GetPlannersUseCase`, `GetPlannerBlocksUseCase`
  - `PlannerService`, `PlannerRepositoryInterface`, `PlannerRepository`
- 응답 shape는 기존 Next.js route handler와 **byte-equal** (jest snapshot 1건)
- FE는 여전히 mock 호출 중 — apps/planner는 변경 없음
- **완료 기준**: 통합 테스트(Testcontainers — pullim 동일 패턴)에서 3 endpoint 모두 기존 응답과 동일.

### Phase ε — planner mutation endpoint 6건 이식 (1 PR)

- POST `/api/planners` (CreatePlanner)
- PATCH `/api/planners/:id` (UpdatePlanner)
- DELETE `/api/planners/:id` (DeletePlanner — active 차단 가드)
- POST `/api/planners/:id/activate` (트랜잭션 + partial unique index 의존)
- POST `/api/planners/:id/archive`, `/unarchive`
- POST `/api/planners/:id/duplicate`
- 각각 use-case + service + DTO + class-validator
- spec §3.2 5종 에러 코드(`not_found`, `validation_failed`, `conflict`, `forbidden`, `internal`) 매핑 유지
- **완료 기준**: 기존 `src/app/api/planners/...` 의 Phase 4 검증 케이스(`proc/archive/2026-05-22_be-phase-4.md` 1.2 표) 전부 재현.

### Phase ζ — planner mock 잔여 시그니처 BE 이식 (1~2 PR)

mock에서 read API로 노출 안 됐던 시그니처들 — `dailyConditions`, `burnoutSnapshots`, `curriculum`, `subjectUnits`, `family`, `subscriptions`, `features` — 의 entity + read endpoint 추가. spec 갱신 동반.

- 이 단계는 mock의 어느 항목까지 BE로 옮길지 다시 결정 필요 (`subscriptions`·`family`는 별 도메인이라 미차용 가능)
- 본 plan에서는 "이 단계 진입 전 mock 매핑 매트릭스 재작성"을 G3·PM 합의 게이트로 둠

### Phase η — FE mock 제거 → `@pullim-planner/api-client` 전환 (1~2 PR)

- `apps/planner/lib/mock/planner.ts` 등을 page/component에서 import한 모든 지점을 `@pullim-planner/api-client` 호출로 치환
- React Server Component 데이터 패칭 패턴(SSG/SSR/CSR) 확정
- mock 파일 자체는 마지막 PR에서만 제거 (회귀 안전망)
- **완료 기준**: `grep -r "from '@/lib/mock/planner'" apps/planner/` 0건, 페이지 동작 회귀 0.

---

## 6. 리스크 매트릭스 + 사전 결정

### 6.1 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| **bun + NestJS 호환성** — `reflect-metadata` + DI + nest-cli watch가 bun에서 모서리 케이스 가능 | NestJS 부팅 자체 실패 시 전체 계획 좌초 | Phase α 진입 직후 30분 spike: `bun --watch apps/backend/src/main.ts` + `nest start --watch` 양쪽 검증. **실패 시 backend만 node + pnpm 자동 분기** (사용자 2026-05-26 지시) — 사용자 재합의 불요, PR 본문에 결과 명시 |
| **bun workspace ↔ turbo 호환성** | Phase α PR 사이즈 부풀어오름 | turbo 2.7.x는 bun workspace 지원. 만약 막히면 root scripts로 wraping하고 turbo는 보류 |
| **현행 Drizzle 스키마 ↔ TypeORM entity 매핑 정확도** | Phase γ에서 DB 스키마 diff 발생 시 마이그레이션 거짓 양성 | `pg_dump --schema-only` 비교 + Phase γ PR에 diff 보고서 첨부 |
| **응답 envelope shape 변경** — pullim envelope 채택 시 기존 raw JSON과 5축 불일치 (§6.2) | Phase δ·ε에서 즉시는 안 보이지만 Phase η에서 FE 분기 전면 폭발 | §6.2 분석 → **옵션 A 자동 채택**. snapshot은 envelope shape로 신규 기록. FE 전환은 Phase η에서 한 번에. |
| **`packages/auth` 가 FE에 인증 토큰 상태를 들고 있게 됨** — Next.js Server Component / Server Action에서의 토큰 접근 | Phase η에서 인증 우회 또는 hydration 미스매치 | MockAuthProvider는 cookie-less, `X-User-Id` 헤더만 사용하므로 서버 측에서는 `headers()` 로 직접 추출 — pullim 패턴과 동일 |
| **migration 운영** — 로컬 DB 초기화 시 Drizzle 마이그레이션과 TypeORM 마이그레이션이 동시에 존재하지 않게 | dev 환경 혼란 | Phase α PR에서 `drizzle/` 폴더 자체 폐기. Phase γ PR 머지 후 사용자는 `bun run db:reset` 1회 실행 필요 (PR 본문 명시) |
| **plan 자체의 PR 7개 분량** | 진행 중에 사용자 우선순위 변동 시 plan 정체 | Phase 별 PR 분할 + 각 PR 본문에서 본 plan §5 단계 링크. PM이 중간에 stop 가능. |

### 6.2 응답 envelope 불일치 — 분석 (2026-05-26 G3 게이트 해소용)

현재 `src/app/api/_lib/response.ts` 와 pullim `ResponseInterceptor` + `HttpExceptionFilter` + `AllExceptionsFilter` 5축 불일치:

| 축 | 현재 (raw) | pullim envelope | byte-equal 가능? |
|---|---|---|---|
| 성공 응답 | `{ data: T }` | `{ success: true, data: T }` | ✗ — `success` 키 추가 |
| 에러 응답 | `{ error: { code, message, details? } }` | `{ success: false, error: { code, message, statusCode } }` | ✗ — `success` 키 + body에 statusCode 중복 + `details` 제거 |
| 에러 코드 네임스페이스 | lowercase snake (`not_found`, `validation_failed`, `conflict`, `forbidden`, `internal`) — spec §3.2 5종 | 도메인 prefix 대문자 (`COMMON_VALIDATION_FAILED`, `USER_NOT_FOUND`, ...) — `ErrorMessages` 상수 | ✗ — 코드 문자열 자체가 다름 |
| validation 에러 표현 | `details` 객체에 errors 배열 (path-aware) | `message`에 string join (`'name should not be empty, age must be number'`) | ✗ — 구조화된 검증 정보 손실 |
| filter 적용 범위 | route handler 안에서 `apiError()` 명시 호출 | `HttpException` 던지면 전역 `HttpExceptionFilter` 자동 변환 + `AllExceptionsFilter` 가 unhandled까지 캐치 | n/a — 메커니즘 자체가 다름 |

**결정 — 옵션 A 자동 채택** (G3 게이트 해소):

- Phase β에서 `ResponseInterceptor` / `HttpExceptionFilter` / `AllExceptionsFilter` 셋 + `ErrorMessages` 상수 모두 그대로 차용
- 에러 코드 매핑은 `apps/backend/src/common/constants/error-messages.constant.ts` 신규 생성:
  - `COMMON_VALIDATION_FAILED` ← 현 `validation_failed`
  - `COMMON_NOT_FOUND` ← 현 `not_found` (도메인별 변형도 추가: `PLANNER_NOT_FOUND`, `USER_NOT_FOUND`)
  - `COMMON_CONFLICT` ← 현 `conflict`
  - `COMMON_FORBIDDEN` ← 현 `forbidden`
  - `COMMON_UNKNOWN_ERROR` ← 현 `internal`
- Phase δ snapshot은 envelope shape로 **새로 기록** (byte-equal 목표 폐기)
- Phase γ entity·DTO 작성 시 `class-validator` 기반 검증 통일 — 기존 `_lib/validation.ts` 의 path-aware 정보는 손실되지만 spec §3.2 외부 계약은 envelope 안에 흡수
- Phase η에서 FE 측 `res.data` 접근부 + 에러 분기 매핑 일괄 갱신

**G3 게이트 무력화** — 사용자 2026-05-26 지시 ("조치 변경되면 게이트 불요"):
1. bun + NestJS 채택 → 실패 시 pnpm 자동 전환 (지시)
2. envelope 정책 → 옵션 A 자동 채택 (본 분석 근거)
3. Data Mapper 채택 → 차용 결정에 포함 (자명)

→ Phase β 진입 전 G3 합의 게이트 사실상 0건. 대신 각 PR 본문에 본 §6.2 링크.

---

## 7. 게이트키퍼 합의 포인트

- **G3 (BE 게이트키퍼)** — §6.2에 따라 합의 게이트 없음. PR 본문에 결정 근거 링크 필수.
- **G4 (FE 게이트키퍼)** — Phase η 진입 시점에서 데이터 페칭 패턴(Server Component fetch vs Server Action vs `@pullim-planner/api-client`) 확정 + envelope 분기 처리 합의
- **G1** — 본 plan은 *내부 구조 작업*이므로 G1 합의는 §5 진척 보고 시점에 일괄

본 plan은 G3 합의 게이트 부재 상태로 Phase α → η 까지 연속 진입 가능.

---

## 8. 본 plan의 완료 정의

§1 "완료 기준" 5줄 모두 충족 시 — 사용자 명시("archive로 옮겨")가 있을 때만 `proc/archive/2026-05-26_pullim-be-adoption.md` 로 이동 (메모리 룰 [feedback_plan_archive.md]).

---

## 9. 다음 단계

본 plan 동의 시 — Phase α 진입. 진입 시 작업 순서:
1. bun + NestJS 30분 spike (§6 리스크 1번)
2. `apps/planner/` 디렉토리로 현 코드 이동 + import 경로 갱신 + `bun dev` 동작 검증
3. `apps/backend/` 빈 NestJS 스캐폴딩 + Hello World
4. `packages/{types,api-client,auth}/` 빈 패키지
5. workspace · turbo · tsconfig.base 셋업
6. CLAUDE.md / AGENTS.md / README.md / spec 갱신
7. **폐기**: `drizzle/`, `src/lib/db/`, `src/app/api/`, `scripts/seed.ts`, drizzle 의존성
8. 1개 PR로 묶어 push (Codex Review 통과 후 머지)

본 9단계 진입 여부 — 사용자 응답 대기.
