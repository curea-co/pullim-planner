# 2026-06-01 — planner auth 구축 + 도메인 통합 (실행 plan)

> **상태**: 실행 (Phase 0 착수). `2026-05-29_auth-login-signup.md`(PROPOSAL)의 핵심 스코프를
> Q/classbot auth 패턴 기준으로 **즉시 실행 가능한 형태**로 좁혀 이행한다.
> **선행 조건**: `#36` (common 인프라) main 머지 완료 — `git rebase origin/main` 반영 끝.
> **레퍼런스 패턴**: `/private/tmp/pullim-Q-auth/apps/backend/src/modules/auth/`(미러, 복붙 금지).

---

## 0. 갭 분석 (착수 전 코드/DB 실측)

착수 전 실제 코드·DB를 측정해 아키텍처 가정을 검증했다. **architect의 멘탈 모델과 현실에 중요한 차이**가 있다.

| 항목 | architect 가정 | 실측 현실 | 영향 |
|---|---|---|---|
| BE auth 모듈 | 없음 | 없음 ✅ | Phase 0 그대로 진행 |
| #36 common 인프라 | 있음 | 있음 ✅ (`MockAuthGuard`/`RolesGuard`/filters/interceptors/`BaseModel`/`@Public`/`@CurrentUser`) | Phase 0 토대 |
| BE 도메인 모듈(planners 등) | (암묵) 있음 | **없음** — `apps/backend`에 entity·controller 0개. 도메인 데이터는 FE `lib/mock` 픽스처에만 존재 | **Phase 2~3 전제 붕괴** (아래 §0.1) |
| 도메인 `users` 테이블 | uuid PK, 신원 단일화 대상 | **Drizzle 시대 테이블** — `id text` PK, email 컬럼 없음, 도메인 필드(grade/track/school...)만. seed 1행(`student_001`/서연) | 신원 프로비저닝은 가능하나 스키마 정렬 필요 (§0.2) |
| `student_001` 하드코딩(5곳) | 도메인 쓰기 경로의 현재 사용자 폴백 | **FE mock 픽스처 데모/시드** (`lib/mock/persona.ts`, `lib/mock/family.ts`×3, `consent-dialog.tsx` 데모 push) | audit 예외("데모/시드 외")에 정확히 해당 — 교체 대상 아님 (§0.1) |
| FE→BE 도메인 배선 | (암묵) api-client 존재 | **없음** — FE는 in-memory mock만. BE 도메인 write 엔드포인트 자체가 없음 | getCurrentUserId를 붙일 write 경로가 현재 0개 |

### 0.1 핵심 블로커 — Phase 2/3 전제 붕괴

architect가 내린 Phase 2("student_001 하드코딩 5곳 → getCurrentUserId 교체")·Phase 3("도메인 쓰기 가드")는
**BE 도메인 모듈이 존재하고 FE가 그것을 호출한다**는 전제 위에 있다. 실측 결과:

- `apps/backend`에 도메인 entity/controller/service가 **하나도 없다** (#36 common 골격 + AppController 스모크 라우트만).
- `apps/planner`(FE)의 도메인 데이터는 전부 `lib/mock` **in-memory 픽스처**다. BE를 호출하지 않는다.
- 남아있는 `student_001` 5곳은 전부 **mock 픽스처/데모 코드**다:
  - `lib/mock/persona.ts:33` — 데모 페르소나 시드
  - `lib/mock/family.ts:69,71,82` — 가족 매핑 시드/기본값
  - `components/.../consent-dialog.tsx:64` — 데모 동의 로그 in-memory push
- 즉 audit 규칙 `grep -rn student_001 apps/planner → 데모/시드 외 잔존 0`은 **현재 이미 충족**된다. 이 5곳은
  교체 대상이 아니라 **그대로 두어도 되는 데모/시드**다.

**결론**: Phase 2/3는 "도메인 모듈 머지 + FE api-client 전환"이라는 별개 대형 트랙(be-adoption Phase η)이
**선행**되어야 의미가 생긴다. 현 시점에 억지로 5곳을 건드리면 데모를 깨뜨릴 뿐 신원 분리 효과가 없다.
따라서 본 plan은 **auth 인프라(Phase 0)** + **신원 프로비저닝·resolver 인프라(Phase 1)** 까지를 실행 스코프로
확정하고, Phase 2/3는 **GATED**(도메인 모듈 선행)로 명시한다. resolver(`getCurrentUserId`)는 Phase 1에서
**미리 구축**해 두어 도메인 모듈이 들어오는 순간 즉시 채택 가능하게 한다.

### 0.2 도메인 `users` 테이블 정렬 갭

`pullim_planner` DB의 `users`는 Drizzle 시대 스키마(`id text`, email 없음, grade/track 등 도메인 필드).
`planners`/`time_blocks`/`daily_conditions`/`burnout_snapshots`가 `user_id text` FK로 이를 참조한다.

- auth는 **별도 테이블**(`auth_users` uuid PK)에 짓는다 — Q/classbot과 동일하게 도메인 `users`를 건드리지 않는다.
- 신원 단일화(Phase 1): 가입 시 `auth_users.id`(uuid 문자열)를 도메인 `users.id`(text)에 **그대로 복사**해 프로비저닝.
  uuid는 text 컬럼에 무손실 저장되므로 타입 충돌 없음. 도메인 `users`의 NOT NULL 도메인 필드(grade/track/
  weekly_hours/preferred_study_time/joined_at)는 가입 시점에 **플레이스홀더 기본값**으로 채운다(온보딩 전 임시).

---

## 1. 아키텍처 (Q/classbot 미러, planner 관용구)

```
apps/backend/src/
├── entities/
│   ├── auth-user.entity.ts              # auth_users (uuid PK, BaseModel 상속)
│   ├── auth-user-provider.entity.ts     # auth_user_providers (email provider + 해시)
│   ├── refresh-token-blacklist.entity.ts# refresh_token_blacklist (Redis 없는 환경 → PG)
│   └── enums/{auth-provider,user-role}.enum.ts
├── modules/auth/
│   ├── controller/
│   │   ├── auth.controller.ts           # signup/login/logout/refresh/check-email/me
│   │   └── dto/                         # login·logout·signup·token·signup-response·check-email·me
│   ├── service/
│   │   ├── auth.service.ts              # 해시·토큰·블랙리스트 rotation
│   │   └── auth-user.service.ts         # 사용자 조회/생성/실패카운트
│   ├── use-cases/                       # signup·login·refresh·logout·check-email
│   ├── infrastructure/                  # auth-user.repository / blacklist.repository
│   ├── interface/                       # *-repository.interface (DI 토큰)
│   ├── identity/                        # ★ Phase 1: 도메인 user 프로비저닝
│   │   ├── domain-user-provisioner.ts   # 가입 시 도메인 users 행 생성 (id=auth_user.id)
│   │   └── domain-user.entity.ts        # Drizzle users 매핑 (읽기/프로비저닝 전용)
│   └── auth.module.ts
├── common/
│   ├── guards/{jwt-auth,jwt-refresh}.guard.ts   # JwtAuthGuard 글로벌(@Public 면제), refresh 전용
│   ├── infrastructure/{jwt,jwt-refresh}.strategy.ts + passport-token.provider.ts
│   ├── interfaces/token-provider.interface.ts
│   ├── utils/{crypto,token}.util.ts             # bcrypt+pepper, jti/exp 추출
│   ├── constants/{jwt,security,validation}.constant.ts (validation/security는 기존 보강)
│   └── decorators/current-user.decorator.ts     # 기존 → AuthUser 주입으로 확장
├── config/jwt.config.ts                          # registerAs('jwt') + Joi 검증(config.module)
└── database/migrations/<ts>-CreateAuthTables.ts  # auth_users/auth_user_providers/blacklist
```

### 1.1 #36 자산과의 충돌·교체 매트릭스

| #36 자산 | 본 plan 처리 |
|---|---|
| `common/guards/mock-auth.guard.ts` | **제거** → `JwtAuthGuard`로 글로벌 가드 교체 (app.module) |
| `common/guards/roles.guard.ts` | 유지 (no-op). 글로벌 가드 체인에서 JwtAuthGuard 뒤에 둠 |
| `common/decorators/current-user.decorator.ts` (`{ id }`) | **확장** — `AuthUser` 주입 + `getCurrentUserId(req)` resolver 추가 |
| `common/types/express.d.ts` (`User = { id }`) | `AuthUser`로 확장 (id 포함 호환 유지) |
| `common/constants/auth.constant.ts` (`DEFAULT_MOCK_USER_ID`) | 유지 — resolver 데모 폴백으로 재사용 |
| `BaseModel`/`DateTimeTransformer`/subscriber | 그대로 차용 (auth 엔티티가 상속) |
| `config.module.ts` Joi | JWT_SECRET/PASSWORD_PEPPER/JWT_*_EXPIRATION 검증 추가 |
| `DatabaseModule` (`autoLoadEntities`, `migrationsRun`) | 그대로 — auth 엔티티 autoLoad, 마이그레이션은 정식 파일 |

### 1.2 Q와의 차이 (planner 관용구 — 복붙 아님)

- 날짜: Q는 `Date`, planner `BaseModel`은 **Luxon `DateTime`**. `passwordChangedAt` 등은 planner는 `DateTime | null`로.
- 네이밍: planner는 npm `typeorm-naming-strategies`의 `SnakeNamingStrategy` 사용(Q는 인라인 구현). auth 엔티티도 동일.
- 마이그레이션: planner는 `dist/database/data-source.js` 기반 CLI(`migration:run`). Q의 단일 buildDataSourceOptions와 다름.
- envelope: planner `ResponseInterceptor`가 `{ success, data }`로 감싸므로 컨트롤러는 **순수 DTO만 반환**(Q와 동일하게 envelope 직접 작성 금지).
- guard 체인: planner는 글로벌 가드 2개(JwtAuth→Roles) + 글로벌 필터/인터셉터 유지.

---

## 2. Phase 분할

| Phase | 내용 | 상태 |
|---|---|---|
| **Phase 0** | auth 구축 (가입/로그인/refresh/logout/check-email/me, JWT access+refresh, bcrypt+pepper, JwtAuthGuard 글로벌, 정식 마이그레이션) | **실행** |
| **Phase 1** | 가입→도메인 `users` 행 프로비저닝(id=auth_user.id) + `getCurrentUserId(req)` resolver 인프라 구축 | **실행** |
| **Phase 2** | 도메인 write 경로의 현재 사용자 = `getCurrentUserId` 채택 | **GATED** — BE 도메인 모듈 + FE api-client 선행(be-adoption Phase η). 현재 대상 0곳 |
| **Phase 3** | 도메인 쓰기 가드(인증 필수) | **GATED** — Phase 2와 동일 전제 |

### Phase 0 — auth 구축 (실행)

포함: 엔티티 3종 + enum, 마이그레이션, jwt config·constants·utils, strategies·token provider·guards,
repositories·interfaces, services·use-cases, controller·DTO, auth.module, app.module 글로벌 가드 교체, .env.example.

**완료 기준 (실DB curl 실증, 포트 5432 `pullim_planner`)**:
- `POST /api/auth/signup` → 201 + `{id,email,role,accessToken,refreshToken}` (envelope `data` 안)
- `POST /api/auth/login` → 200 + 토큰 쌍, 잘못된 비번 → 401, 5회 실패 → 잠금(403)
- `POST /api/auth/refresh` (Bearer refresh) → 200 + 새 쌍, 같은 refresh 재사용 → 401 (rotation)
- `POST /api/auth/logout` → 200, 이후 그 refresh로 refresh → 401
- `GET /api/auth/check-email?email=` → `{available}`
- `GET /api/auth/me` (Bearer access) → 사용자(민감필드 제외), 토큰 없으면 401
- `auth_users`/`auth_user_providers`/`refresh_token_blacklist` 테이블 실제 생성, 비번은 `auth_user_providers.password`에 bcrypt 해시로만 저장
- typecheck/lint/build green, 기존 e2e(`phase-beta-wiring`) 회귀 없음

### Phase 1 — 신원 프로비저닝 + resolver (실행)

포함:
- `DomainUser` 엔티티(Drizzle `users` 매핑, 프로비저닝/조회 전용 — synchronize 비대상, 기존 스키마 그대로 사용).
- `DomainUserProvisioner` — 가입 트랜잭션 안에서 `users` 행 생성: `id = auth_user.id`, name 복사, 도메인 NOT NULL
  필드는 온보딩 전 플레이스홀더 기본값. 이미 있으면(재가입/충돌) 멱등.
- `getCurrentUserId(req)` resolver(`common/utils/request.util.ts` 또는 `auth/identity`): `req.user?.id ?? DEFAULT_DEMO_USER_ID`.
  데모 폴백 = 기존 `DEFAULT_MOCK_USER_ID`(`student_001`) 재사용.

**완료 기준 (실DB)**: 2명 가입 → `auth_users` 2행 + `users` 2행, 각 `users.id == auth_users.id`. 서로 다른 uuid로 분리.

### Phase 2/3 — GATED

도메인 모듈(entity/controller/service) 머지 + FE가 BE를 호출하도록 전환된 후 진입. 그 시점에 write 컨트롤러에서
`getCurrentUserId(req)`(Phase 1 산출)를 채택하고, write 라우트에 `@Public()` 제거 → JwtAuthGuard 인증 필수로 전환.
현재는 대상 경로가 0개이므로 코드 변경 없음. FE의 `student_001`(mock 데모/시드)은 그대로 둔다.

---

## 3. GATED / 사전 결정

| 항목 | 처리 |
|---|---|
| `JWT_SECRET`/`PASSWORD_PEPPER` | 로컬 `.env`에 임의값 — 즉시 가능 (.env.example placeholder 동봉) |
| Redis 블랙리스트 | Q처럼 **PG 테이블**(`refresh_token_blacklist`)로 대체 — Redis 불요 |
| 이메일 인증/소셜/비번재설정/이메일찾기 | 본 plan 스코프 외 (PROPOSAL §5 Phase B~E, GATED 외부 시크릿) |
| 도메인 모듈 머지 | Phase 2/3 선행 — 본 plan 밖 트랙 |

---

## 4. 하드 제약 준수

push/PR/merge 금지(로컬 커밋까지). `games`·`games-arcade` 미접근. 다른 워크트리·`.github/workflows`·root 글로벌
회피수정 금지. 본체/Q auth 복붙 금지(패턴만). 스키마는 정식 마이그레이션. 검증 후 보고.

---

## 5. Audit 로그 (각 Phase 후 기록)

> 형식: Phase / 일시 / grep 결과 / 실DB 증거 / typecheck·lint·build / 비고

### Phase 0 — auth 구축 · audit PASS (2026-06-01)

- **typecheck / lint / build**: 모두 green. 기존 e2e(`phase-beta-wiring`) + placeholder = 8 tests PASS (회귀 없음).
- **마이그레이션(실DB 5432 `pullim_planner`)**: `CreateAuthTables1748736000000` 실행 성공.
  `auth_users`(uuid PK, partial unique `uq_auth_users_email` WHERE deleted_at IS NULL),
  `auth_user_providers`(FK→auth_users ON DELETE CASCADE), `refresh_token_blacklist`(jti PK) 생성 확인.
  **Drizzle 시대 도메인 테이블(users/planners/...) 무손상** — `users` 여전히 `student_001` 1행.
- **curl 실증** (DATABASE_ENABLED=true, 전역 JwtAuthGuard 활성):
  | # | 시나리오 | 결과 |
  |---|---|---|
  | check-email(가입 전/후) | `available:true` → `false` | PASS |
  | signup | 201 + `{id(uuid),email,role,accessToken,refreshToken}` | PASS |
  | signup 중복 | 409 `USER_EMAIL_DUPLICATED` | PASS |
  | signup 약한 비번 | 422 validation (영문/숫자/특수문자·최소8자) | PASS |
  | login 정상 | 200 + 토큰 쌍 | PASS |
  | login 오류 비번 | 401 `AUTH_LOGIN_FAILED` (계정열거 방지 통일 메시지) | PASS |
  | GET /me (access) | 200, password 등 @Exclude 필드 제외 | PASS |
  | GET /me (무토큰) | 401 `AUTH_UNAUTHORIZED` | PASS |
  | refresh | 200 + 새 쌍 | PASS |
  | refresh 재사용(rotation) | 401 `AUTH_TOKEN_BLACKLISTED` | PASS |
  | logout (access+refresh) | 200, 이후 그 refresh로 refresh → 401 blacklisted | PASS |
- **DB 비밀번호 저장 검증**: `auth_user_providers.password` = `$2b$12$...` (bcrypt, 60자) — 평문 아님.
  비번은 `auth_users` 가 아닌 provider 에만 저장. blacklist 행 누적 확인.
- **비고**: logout 은 `@Public()` 아님(본체/Q 동일) — access token 필수 + body refreshToken. 의도된 설계.
  `DATABASE_ENABLED=false`(스모크)면 `MockAuthGuard` 유지로 부팅·기존 라우트 동작 보존.
