# 2026-05-29 — planner auth 도입 설계 제안 (PROPOSAL)

> **상태**: PROPOSAL — 즉시 실행 게이트 아님.
> **선행 조건**: `#36` (feat/refactor/phase-beta-common) 머지·정리 후 진입.
> **본 문서의 권위 위치**: `proc/plan/2026-05-26_pullim-be-adoption.md` Phase η 의 구체화 제안.

---

## 1. 목표

planner BE(`apps/backend`)에 pullim 본체 auth 풀세트를 도입한다.

### 구체 범위

| 기능 그룹 | 내용 |
|---|---|
| 이메일·비밀번호 | 회원가입 / 로그인 / 로그아웃 / 이메일 중복 확인 |
| 이메일 인증 | 인증 코드 발송·검증 (회원가입·비밀번호 재설정 목적 분리) |
| 비밀번호 재설정 | 코드 발송 → 코드 검증 + resetToken 발급 → 새 비밀번호 확정 |
| 이메일 찾기 | 본인인증(CI/DI) 기반 이름으로 가입 이메일 조회 |
| 소셜 로그인 | 카카오·네이버 OAuth (state CSRF 방지 + socialSignupToken 흐름) |
| 소셜 회원가입 | 소셜 로그인 후 미가입자 → socialSignupToken 교환 → 가입 완료 |
| JWT | Access Token + Refresh Token 쌍 발급·갱신·블랙리스트 로그아웃 |
| 로그인 이력 | IP·User-Agent 기록, 탈퇴 시 비식별화 + 아카이브 격리 |

### 부차 목표

- planner가 나중에 pullim 플랫폼 서브도메인으로 흡수될 때 **ID 충돌 없이 병합** 가능한 엔티티 구조 확보.
- `packages/auth` 의 `IAuthProvider` 추상화 위에서 MockAuthProvider → JwtAuthGuard 교체가 최소 변경으로 가능하도록 guard 레이어 설계.

---

## 2. 본체 auth 엔드포인트·레이어 매핑표

### 2.1 엔드포인트

| 메서드 | 경로 | UseCase | 설명 |
|---|---|---|---|
| POST | `/api/auth/email-verification/send` | `SendEmailVerificationUseCase` | 이메일 인증 코드 발송 |
| POST | `/api/auth/email-verification/verify` | `VerifyEmailCodeUseCase` | 이메일 인증 코드 검증 |
| GET | `/api/auth/check-email` | `CheckEmailUseCase` | 이메일 중복 여부 확인 |
| POST | `/api/auth/signup` | `SignupUseCase` | 이메일 회원가입 |
| POST | `/api/auth/login` | `LoginUseCase` | 이메일 로그인 |
| POST | `/api/auth/logout` | `LogoutUseCase` | 로그아웃 (refresh token 블랙리스트) |
| POST | `/api/auth/refresh` | `RefreshUseCase` | Refresh Token → 새 Access Token |
| POST | `/api/auth/social/state` | `GenerateOAuthStateUseCase` | OAuth CSRF state 생성 |
| POST | `/api/auth/social/:provider` | `SocialLoginUseCase` | 소셜 로그인 (kakao/naver) |
| POST | `/api/auth/signup/social` | `SocialSignupUseCase` | 소셜 회원가입 |
| POST | `/api/auth/find-email` | `FindEmailUseCase` | 이메일 찾기 (본인인증) |
| POST | `/api/auth/reset-password/send-code` | `SendPasswordResetCodeUseCase` | 비밀번호 재설정 코드 발송 |
| POST | `/api/auth/reset-password/verify-code` | `VerifyPasswordResetCodeUseCase` | 비밀번호 재설정 코드 검증 |
| POST | `/api/auth/reset-password/confirm` | `ConfirmPasswordResetUseCase` | 비밀번호 재설정 확정 |

### 2.2 레이어 → planner 대응 구조

```
apps/backend/src/modules/auth/
├── controller/
│   ├── auth.controller.ts
│   ├── dto/
│   │   ├── login.dto.ts                   # email, password
│   │   ├── logout.dto.ts                  # refreshToken
│   │   ├── signup.dto.ts                  # email, password, name, marketingConsent
│   │   ├── signup-response.dto.ts
│   │   ├── token-response.dto.ts          # accessToken, refreshToken
│   │   ├── check-email-query.dto.ts
│   │   ├── send-email-verification.dto.ts # email, purpose
│   │   ├── verify-email-code.dto.ts       # email, code, purpose
│   │   ├── social-login.dto.ts            # code, state, redirectUri
│   │   ├── social-login-response.dto.ts
│   │   ├── social-signup.dto.ts           # socialSignupToken, name, ...
│   │   ├── find-email.dto.ts              # name, phone (본인인증 기반)
│   │   ├── find-email-response.dto.ts
│   │   ├── request-password-reset.dto.ts
│   │   ├── verify-password-reset-code.dto.ts
│   │   ├── confirm-password-reset.dto.ts
│   │   └── simple-response.dto.ts         # MessageResponseDto 등 경량 응답
│   └── swagger/
│       └── auth-api.decorator.ts          # @ApiLogin, @ApiSignup … 패턴
├── use-cases/
│   ├── login.use-case.ts
│   ├── logout.use-case.ts
│   ├── refresh.use-case.ts
│   ├── signup.use-case.ts
│   ├── check-email.use-case.ts
│   ├── social-login.use-case.ts
│   ├── social-signup.use-case.ts
│   ├── generate-oauth-state.use-case.ts
│   ├── send-email-verification.use-case.ts
│   ├── verify-email-code.use-case.ts
│   ├── find-email.use-case.ts
│   ├── send-password-reset-code.use-case.ts
│   ├── verify-password-reset-code.use-case.ts
│   ├── confirm-password-reset.use-case.ts
│   └── index.ts
├── service/
│   ├── auth.service.ts                    # 토큰·비밀번호·Redis 조작
│   └── social-auth.interface.ts           # SocialUserInfo, SocialSignupTokenPayload
├── interface/
│   └── user-repository.interface.ts       # (UserModule과 공유 or UserModule에서 import)
├── infrastructure/
│   ├── jwt.strategy.ts                    # PassportStrategy('jwt')
│   ├── jwt-refresh.strategy.ts            # PassportStrategy('jwt-refresh')
│   └── kakao-naver.provider.ts            # 소셜 OAuth HTTP 어댑터
└── auth.module.ts
```

### 2.3 공통 인프라 위치

| 파일 | 위치 | 역할 |
|---|---|---|
| `JwtAuthGuard` | `common/guards/jwt-auth.guard.ts` | 글로벌 Access Token guard (`APP_GUARD`) |
| `JwtRefreshGuard` | `common/guards/jwt-refresh.guard.ts` | `/auth/refresh` 전용 guard |
| `@Public()` | `common/decorators/public.decorator.ts` | 인증 면제 마커 |
| `@CurrentUser()` | `common/decorators/current-user.decorator.ts` | `req.user` 추출 |
| `jwt.config.ts` | `config/jwt.config.ts` | `registerAs('jwt', ...)` — secret·expiration·refreshExpiration |

---

## 3. User 엔티티 본체 정본 정렬

planner User는 본체 `User` 시그니처를 그대로 차용한다. 향후 pullim 흡수 시 컬럼 충돌을 최소화하기 위해 필드명·타입을 맞춘다.

### 3.1 본체 User 필드 전체 표

| 필드 | DB 컬럼 | 타입 | Nullable | 비고 |
|---|---|---|---|---|
| `id` | `id` | `uuid` PK | No | `BaseModel` 상속, UUID v4 자동 생성 |
| `createdAt` | `created_at` | `timestamptz` | No | `BaseModel` 상속 |
| `updatedAt` | `updated_at` | `timestamptz` | No | `BaseModel` 상속 |
| `deletedAt` | `deleted_at` | `timestamptz` | Yes | `BaseModel` 상속, soft delete |
| `name` | `name` | `varchar` | No | 회원 이름 |
| `email` | `email` | `varchar` | No | 로그인 식별자, partial unique index |
| `phone` | `phone` | `varchar(20)` | Yes | 전화번호 |
| `profileImage` | `profile_image` | `text` | Yes | 프로필 이미지 URL |
| `role` | `role` | `enum(user,admin)` | No | 기본값 `user` |
| `isEmailVerified` | `is_email_verified` | `boolean` | No | 기본값 `false` |
| `marketingConsent` | `marketing_consent` | `boolean` | No | 기본값 `false` |
| `marketingConsentDate` | `marketing_consent_date` | `timestamptz` | Yes | 동의/철회 시점 |
| `withdrawalRequestedAt` | `withdrawal_requested_at` | `timestamptz` | Yes | 탈퇴 요청 시점 (7일 유예), `@Exclude` |
| `passwordChangedAt` | `password_changed_at` | `timestamptz` | Yes | 마지막 비밀번호 변경 시각, `@Exclude` |
| `ci` | `ci` | `text` | Yes | 연계정보 AES-256-GCM 암호화, `@Exclude` |
| `di` | `di` | `text` | Yes | 중복확인정보 AES-256-GCM 암호화, `@Exclude` |
| `diHash` | `di_hash` | `varchar(64)` | Yes | DI SHA-256 해시 (중복검사용), `@Exclude` |
| `verifiedAt` | `verified_at` | `timestamptz` | Yes | 본인인증 완료 시각 |
| `learningNotificationEnabled` | `learning_notification_enabled` | `boolean` | No | 기본값 `true` |
| `metadata` | `metadata` | `jsonb` | Yes | 추가 메타데이터 |

> 날짜 필드는 Luxon `DateTime` 사용. `DateTimeTransformer`·`dateTimeToIso` 패턴 그대로 차용.

### 3.2 관련 보조 엔티티

| 엔티티 | 테이블 | 역할 |
|---|---|---|
| `UserAuthProvider` | `user_auth_providers` | 인증 제공자 (email/kakao/naver), 비밀번호 해시, 잠금 상태 |
| `EmailVerification` | `email_verifications` | 6자리 인증 코드 + 목적(purpose) + 만료·시도횟수 |
| `LoginHistory` | `login_histories` | IP·UA 기록, 탈퇴 시 `userId SET NULL` + IP 마스킹 |
| `LoginHistoryArchive` | `login_history_archives` | 탈퇴 시 원본 이력 격리 (3개월 보관 후 hard delete) |

### 3.3 planner 고유 필드 (본체에 없는 것)

planner 도메인에서 필요한 필드가 생기면 `metadata jsonb` 에 넣거나 별도 `PlannerProfile` 엔티티로 분리하는 것을 권장한다. User에 직접 컬럼 추가는 병합 충돌 위험 — **사용자 결정 필요**.

---

## 4. 병합 구조 고려 — planner → pullim 흡수 시

### 4.1 알려진 간극

| 항목 | planner (현행) | 본체 pullim | 해소 전략 |
|---|---|---|---|
| PK 타입 | planner BE 현재 uuid (Phase γ 이후) | uuid | 동일 — 충돌 없음 |
| 역할 enum | planner: `user` / `admin` (2종) | pullim: `user` / `admin` (2종) | 동일 — 충돌 없음 |
| 플래너 전용 User 컬럼 | 없음 (현재 BE 미구현) | 없음 | 신설 시 `metadata` 활용 권장 |
| 소셜 provider | kakao·naver | kakao·naver | 동일 |
| 패키지 매니저 | bun | pnpm | 병합 시 루트 workspace 전략 재합의 필요 — **사용자 결정 필요** |
| 네임스페이스 | `@pullim-planner/*` | `@pullim/*` | 병합 시 패키지명 일괄 rename — 코드 변경 최소화 목적으로 지금은 분리 유지 |

### 4.2 ID 매핑 전략

- planner User PK는 **uuid**이므로 pullim User PK와 타입 충돌 없음.
- 흡수 시 `planner_users` → `users` 테이블 병합이 필요. 이 시점에 `user_id` FK를 가진 planner 도메인 테이블(planners, time_blocks 등)도 함께 재매핑.
- 병합 전 단계에서는 planner BE의 `users` 테이블이 독립 존재 — 풀림 플랫폼 로그인 계정과 별도.
- 병합 마이그레이션 전략(UPSERT/UUID 재사용/MERGE 여부)은 흡수 시점 결정 사항 — **지금은 별도 플래닝 불요**.

### 4.3 역할 3종 불일치 메모

현행 pullim `UserRole`은 `user / admin` 2종. 메모리에 "역할 3종 불일치" 언급이 있으나 현 본체 코드에서는 2종만 확인됨. planner도 2종으로 맞춘다. 향후 pullim에서 역할이 늘어날 경우 planner entity는 enum 확장만으로 대응 가능.

---

## 5. Phase 분할

각 Phase는 독립 PR로 머지 가능. 이전 Phase 머지 후 진입.

### Phase A — User 엔티티 + 이메일·비밀번호 핵심 인증 (1~2 PR)

**목표**: 로그인·회원가입·로그아웃·JWT 발급의 최소 동작 사이클 구현.

포함 항목:
- `apps/backend/src/entities/` — `user.entity.ts`, `user-auth-provider.entity.ts`
- `packages/auth/` — `IAuthProvider` 인터페이스 구체화 + `MockAuthProvider`(기존) / `JwtAuthGuard` 교체 경로 확보
- `modules/auth/` — `AuthController` (login·logout·signup·check-email·refresh), `AuthService` (토큰·비밀번호·blaclist), `LoginUseCase`, `LogoutUseCase`, `SignupUseCase`, `CheckEmailUseCase`, `RefreshUseCase`
- `common/guards/jwt-auth.guard.ts`, `jwt-refresh.guard.ts` — `APP_GUARD` 글로벌 등록
- `common/infrastructure/jwt.strategy.ts`, `jwt-refresh.strategy.ts`
- `config/jwt.config.ts` — `registerAs('jwt', ...)`, Joi 검증 추가
- `PASSWORD_PEPPER` 환경변수 추가
- Refresh Token 블랙리스트 — Phase β에서 도입된 Redis(또는 대체 스토어) 활용. **Redis 없이 Phase A 완료 원하면 in-memory Map으로 임시 대체 후 Phase B에서 Redis 교체** (사용자 결정 필요)

완료 기준:
- `POST /api/auth/signup` → 201, `POST /api/auth/login` → 200 + JWT 쌍, `POST /api/auth/logout` → 200, `POST /api/auth/refresh` → 200
- `JwtAuthGuard` 글로벌 적용 — 기존 planner 엔드포인트에 `@Public()` 또는 JWT 보호 정상 동작
- 단위 테스트: `AuthService`, `LoginUseCase`, `SignupUseCase` 핵심 분기

### Phase B — 이메일 인증 + 비밀번호 재설정 (1 PR)

포함 항목:
- `entities/email-verification.entity.ts`
- `SendEmailVerificationUseCase`, `VerifyEmailCodeUseCase`
- `SendPasswordResetCodeUseCase`, `VerifyPasswordResetCodeUseCase`, `ConfirmPasswordResetUseCase`
- 이메일 발송 서비스 (`SES` 또는 `SMTP` — **GATED: 외부 자격증명 필요, §7 참조**)
- 개발/테스트용 `console.log` 이메일 어댑터 (시크릿 없이 로컬 동작)

완료 기준:
- 회원가입 플로우: 인증 코드 발송 → 검증 → `isEmailVerified = true` → 가입 가능
- 비밀번호 재설정 플로우: 코드 발송 → 코드 검증 + resetToken → 비밀번호 확정
- 이메일 발송 어댑터 추상화 — 로컬에서는 console 출력, 프로덕션에서 SES/SMTP 교체

### Phase C — 소셜 로그인 (kakao·naver) (1 PR)

포함 항목:
- `SocialLoginUseCase`, `SocialSignupUseCase`, `GenerateOAuthStateUseCase`
- `infrastructure/kakao-naver.provider.ts` — 소셜 OAuth 토큰 교환 + 프로필 조회 HTTP 어댑터
- `SocialProvider` enum, `UserAuthProvider` 소셜 레코드 생성
- socialSignupToken Redis 저장 흐름

완료 기준:
- `POST /api/auth/social/:provider` — 기가입 → JWT 쌍 반환, 미가입 → `socialSignupToken` 반환
- `POST /api/auth/signup/social` — socialSignupToken 소비 → 가입 완료
- **GATED: 카카오·네이버 앱 키 없으면 통합 테스트 불가 (§7 참조)**. 단위 테스트는 mock 어댑터로 가능.

### Phase D — 로그인 이력 (1 PR)

포함 항목:
- `entities/login-history.entity.ts`, `entities/login-history-archive.entity.ts`
- 로그인 UseCase에 `LoginHistory.create(...)` 저장 훅 추가
- 탈퇴 시 비식별화 (userId SET NULL, IP 마스킹, UA null) + 아카이브 격리 로직
- 이력 조회 API (옵션 — 관리자 전용, 사용자 결정 필요)

완료 기준:
- 로그인 성공 시 `login_histories` 1행 생성 (IP·UA·loginAt)
- 탈퇴 흐름에서 비식별화 + `login_history_archives` 이관 동작

### Phase E — 이메일 찾기 (선택, 1 PR)

포함 항목:
- `FindEmailUseCase` — CI/DI 본인인증 기반
- **GATED: 본인인증 연동 (NICE/KCB 등) 외부 계약 필요 (§7 참조)**. 본인인증 없이 구현 불가.
- planner 서비스에 본인인증이 필요한지 검토 후 진입 결정 — **사용자 결정 필요**.

---

## 6. #36·be-adoption과의 조율 (중요)

### 6.1 진입 조건

**본 plan의 코드 착수는 `#36` (feat/refactor/phase-beta-common) 머지·CI 그린 확인 후다.**

`#36`은 planner BE 공통 인프라(bootstrap·filters·guards·interceptors·MockAuthGuard·RolesGuard)를 표면 소유하고 있다. 본 plan의 Phase A는 `#36`이 만든 `common/` 골격 위에서 `jwt.strategy.ts`, `jwt-auth.guard.ts` 등을 덮어쓰거나 교체하는 방식으로 진행한다. `#36` 머지 전에 auth 코드를 작성하면 양쪽 PR이 `common/guards/` 등에서 충돌한다.

### 6.2 be-adoption Phase η와의 관계

`proc/plan/2026-05-26_pullim-be-adoption.md` Phase η는 "FE mock 제거 → api-client 전환"을 기술하고 있으며, 인증 도입이 암묵적으로 포함된다. 본 문서는 그 인증 부분을 구체화한 **설계 제안**이다.

- be-adoption Phase η 진입 시 본 plan의 Phase A~D를 선행 완료하는 것을 권장.
- be-adoption의 완료 기준("mock import 0건") 달성을 위해 auth가 실동작해야 api-client 전환이 의미 있음.

### 6.3 충돌 회피 매트릭스

| 영역 | #36 소유 | 본 plan 예정 변경 | 충돌 가능성 | 해소 방법 |
|---|---|---|---|---|
| `common/guards/` | `MockAuthGuard`, `RolesGuard` 스켈레톤 | `JwtAuthGuard`, `JwtRefreshGuard` 신규 + MockAuthGuard 제거 | 높음 | #36 머지 후 진입 |
| `common/infrastructure/` | 없음 or 빈 폴더 | `jwt.strategy.ts`, `jwt-refresh.strategy.ts` 신규 | 낮음 | 없음 |
| `config/` | `jwt.config.ts` placeholder (가능성) | `jwt.config.ts` 실구현 | 중간 | #36 머지 후 덮어쓰기 |
| `entities/` | 없음 (Phase γ 진입 전) | `user.entity.ts` 등 신규 | 없음 | 없음 |
| `packages/auth/` | `IAuthProvider` placeholder | `IAuthProvider` 구체화 + JwtAuthGuard 교체 경로 | 중간 | #36 머지 후 진입 |

---

## 7. GATED 항목 (외부 자격증명 필요)

코드 구현은 가능하나 **실제 동작·통합 테스트에 외부 시크릿이 필요**한 항목.

| 항목 | 필요 자격증명 | 없을 때 대안 |
|---|---|---|
| **JWT 서명** | `JWT_SECRET` (임의 문자열 가능) | 로컬 `.env`에 임의값 설정 — 즉시 가능 |
| **비밀번호 해싱 pepper** | `PASSWORD_PEPPER` (임의 문자열 가능) | 로컬 `.env`에 임의값 설정 — 즉시 가능 |
| **이메일 발송 (인증 코드)** | `SES_*` 또는 `SMTP_*` 자격증명 | 로컬: console.log 어댑터로 코드 출력 후 수동 입력 |
| **카카오 소셜 로그인** | 카카오 앱 키 (`KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`) | 단위 테스트만 가능 (mock 어댑터). 통합 테스트·실 동작 불가 |
| **네이버 소셜 로그인** | 네이버 앱 키 (`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`) | 단위 테스트만 가능 (mock 어댑터). 통합 테스트·실 동작 불가 |
| **이메일 찾기 (본인인증)** | NICE/KCB 본인인증 계약 + 앱 키 | 계약 없으면 Phase E 전체 보류 |
| **Redis (토큰 블랙리스트·소셜 토큰)** | Redis 인스턴스 (`REDIS_HOST`, `REDIS_PORT`) | Phase A 한정: in-memory Map 임시 대체 가능. 사용자 결정 필요 |

`apps/backend/.env.example`에 위 환경변수 placeholder 추가는 Phase A PR에 동봉한다.

---

## 8. 블로커 및 사전 결정 요청

| 항목 | 내용 | 유형 |
|---|---|---|
| **#36 머지** | 본 plan 코드 착수 전 #36 CI 그린 + 머지 필수 | 외부 의존 (자동 해소) |
| **Phase A Redis 여부** | 블랙리스트 저장소: Redis vs in-memory Map (개발 편의 vs 운영 정합) | **사용자 결정 필요** |
| **이메일 발송 공급자** | SES vs SMTP vs 서드파티 (Resend 등) 선택 | **사용자 결정 필요** |
| **Phase E 본인인증** | planner에 이메일 찾기 기능이 필요한지, 계약 여부 | **사용자 결정 필요** |
| **planner User 고유 필드** | planner 전용 사용자 데이터(예: 학년·학교)는 `metadata`에 넣을지 별도 엔티티로 분리할지 | **사용자 결정 필요** |
| **소셜 앱 키 등록** | 카카오·네이버 개발자 콘솔에 planner 앱 등록 + redirect URI 설정 | **사용자 결정 필요** |

---

## 9. 본 문서의 완료 정의

본 문서는 **설계 제안(PROPOSAL)** 이다. 사용자가 내용을 확인하고 "Phase A 착수"를 명시한 시점이 실행 게이트. 착수 후 각 Phase PR 머지 시 이 문서에 진척 체크를 추가하고, 전체 완료 시 `proc/archive/` 로 이동한다.
