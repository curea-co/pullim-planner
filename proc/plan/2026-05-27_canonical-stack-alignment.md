# 풀림 5 도메인 정본 스택 정렬 통합 plan

**작성일**: 2026-05-27
**작성자**: PM (박승훈) + 컨트롤타워 AI
**적용 대상**: `pullim-planner` / `pullim-Q` / `pullim-classbot` / `pullim-games` / `pullim-games-arcade`
**상태**: **PROPOSAL — 합의·게이트 대기 중. 실행 문서 아님.**
**완료 정의**: §1 목표 충족 후 PM 명시 시점에 archive 이관

---

## 0. 권위 우선순위 (Authority Order) — 반드시 먼저 읽을 것

본 문서는 **5 도메인 공통 정본 스택 제안서** 다. 실행 기준으로 채택된 적은 없으며, 각 리포의 기존 권위 문서를 **덮어쓰지 않는다**.

다음 우선순위로 해석한다 (위가 강함):

1. **각 리포 루트 `AGENTS.md` / `CLAUDE.md`** — 현행 운영 규칙. 본 문서가 충돌하는 항목은 항상 패배한다.
2. **각 리포 앱별 가이드 (예: planner 의 `apps/planner/AGENTS.md` / `apps/planner/CLAUDE.md`)** — 루트 `CLAUDE.md` 가 FE 작업의 상세 규칙(UI 컴포넌트 소스, i18n 미도입, 디렉터리, 코드 패턴, Must/Should Fix 체크리스트)을 이 앱별 문서에 위임한다. 본 문서가 정본 스택으로 적은 항목(예: `@pullim/design-system` / `next-intl` / `@sentry/*`)이라도, 현재 이 문서들이 금지·미도입으로 명시한 것을 본 plan 근거로 도입해서는 안 된다.
3. **각 리포 `proc/spec/`** — 도메인 SOT. 본 문서는 spec 변경 제안일 뿐, spec 자체가 아니다.
4. **각 리포 `proc/plan/2026-05-26_pullim-be-adoption.md` / `2026-05-26_container-presenter-adoption.md`** — 이미 채택된 BE/FE 정본 plan. 본 문서가 충돌하는 항목은 패배한다.
5. **본 문서** — PROPOSAL. §15 게이트(G1/G3/G4) 합의 + 각 리포의 spec 갱신 PR이 머지된 뒤에만 실행 게이트로 승격된다.

**구체 패배 사례** (현재 권위 우선 항목 — 본 문서가 다르게 적었더라도 무시):

- planner 의 `bun` 워크스페이스 결정 (현행) vs 본 문서의 `pnpm` 제안 — planner 는 **계속 bun**, pnpm 전환(P0-1)은 **G3 (BE·인프라 게이트)** 통과 후에만. (pnpm 전환은 lockfile·Dockerfile·CI 워크플로 동시 갱신으로 인프라/툴링 사안이므로 FE 전용 G4 가 아니라 G3 가 승인한다. §12·N5 와 동일하게 G3 로 단일 고정.)
- planner / Q / classbot 의 현행 scope-out (JWT / Redis / BullMQ / Design System / i18n / Sentry) — 본 문서가 정본 스택으로 적었더라도, 채택은 각 리포의 별도 spec 갱신 PR을 통해서만. 본 문서 자체로 채택 효력 없음.
- classbot 의 Drizzle 기반 현행 BE 로드맵 — 본 문서의 TypeORM 정본 항목은 **G3(BE 게이트) 승인 후 별도 마이그레이션 plan** 으로 처리. 즉시 전환 아님. (ORM/JWT/Redis 등 BE 변경의 승인 게이트는 §12·§15 대로 G3 이며 FE 전용 G4 가 아니다.)
- games 의 `proc/spec/01~10` 독립 거버넌스 / "다른 풀림 프로젝트 코드 참조 금지" 규칙 — 본 문서로 무효화되지 않는다. games 의 본 문서 채택은 games 의 spec 갱신을 통해서만.
- arcade 의 부트스트랩 단계 — 본 문서의 5 도메인 동기 가정은 arcade 의 Phase 1 (mini-monorepo) 완료 전까지 적용 보류.

**외부 절대 경로 참조 처리**:
구버전(2026-05-27 초안)에는 작성자 로컬 절대경로 (`/Users/curea/...` 류) 가 §2 / 부록 A 에 다수 잔존했다. R2 정정으로 모두 **리포 식별자 + 리포 내 상대경로** (예: `curea-co/pullim` 의 `apps/web/package.json`) 로 치환했다. 본문에 그런 잔존이 추가로 발견되면 모두 "본 문서 작성 시점의 정본 본체 스냅샷 관찰" 로만 해석하고, 후속 PR 은 commit hash 또는 `proc/spec/` 의 별도 spec 발췌를 통해서만 본체 상태를 인용한다.

**머지 효력**:
본 문서가 머지되더라도 자동 실행 게이트가 열리지 않는다. 후속 alignment PR / 마이그레이션 PR 은 **본 문서가 아닌 spec 갱신**을 근거로만 진입한다.

---

## 1. 목표

**5 도메인을 정본 스택(pullim 본체 + pullim-studio + pullim-store 운영 스택) 으로 "구조 모방" 한다. pullim 본체로의 흡수가 아니다 — 5 도메인 모두 별도 레포, 독립 운영을 유지한다.**

핵심 키워드:
- **구조 모방** — 의존성 매트릭스·디렉토리 컨벤션·CI/CD 파이프라인·배포 토폴로지를 본체와 동형으로 맞춘다.
- **본체 흡수 아님** — 각 도메인은 자체 git 레포·자체 ECR·자체 ECS service·자체 RDS 또는 schema·자체 도메인 URL 을 유지한다.
- **5 트랙 동기화** — 5 도메인이 같은 컨벤션으로 굳으면, 다음 라운드의 컨벤션 변경(예: Node 23 → 24, NestJS 11 → 12) 을 한 번에 굴릴 수 있다.

---

## 2. 정본 스택 — 두 출처를 분리

본 §2 는 **두 종류의 출처를 명확히 구분**한다. 후속 마이그레이션이 "본체 정합인가, 별도 정책 제안인가" 를 혼동하지 않도록 표를 분리한다 (codex 지적 반영).

- **§2-A — 본체 리포 검증값**: 루트 `AGENTS.md` 가 권위로 지정한 `curea-co/pullim` 패턴. GitHub UI 또는 동일 checkout 으로 **재현·감사 가능**. 본 문서 작성 시점(2026-05-27)에 정독한 관찰값이며, 후속 PR 은 해당 본체의 *최신* commit 을 다시 확인해야 한다.
- **§2-B — 별도 정책 제안 (repo 비검증)**: `curea-co/pullim` 저장소에 **그대로 존재하지 않거나** 코드로 확인 불가능한 항목. 작성자 운영 의도("사용자 정본 표")에서 온 제안이며, 본체 패턴 자체가 아니다. 채택은 각 리포의 별도 spec 갱신 + 게이트 합의를 통해서만.

### 2-A. 본체 리포 검증값 (`curea-co/pullim` — 감사 가능)

| 영역 | 정본 값 | 본체 출처 |
|---|---|---|
| 모노레포 | Turborepo 2.7.4, `apps/{web,studio,backend,ai}` + `packages/*` | root package.json |
| 패키지 매니저 | **pnpm 10.26.1** (`"packageManager": "pnpm@10.26.1"`) | root package.json |
| FE 프레임워크 | **Next.js 16.1.2** + **React 19.2.3** + TypeScript 5.9.3 | apps/web |
| FE 스타일 | **Tailwind 4.1.18** + `@tailwindcss/postcss` + `tw-animate-css` | apps/web |
| FE i18n | **next-intl 4.1.0** (단일 `messages/{ko,en}.json`, namespace 없음) | apps/web + apps/web/CLAUDE.md |
| FE 데이터 | **@tanstack/react-query 5.90.21** | apps/web |
| FE 폼 | react-hook-form 7.72.1 + @hookform/resolvers 5.2.2 + zod 4.3.6 | apps/web |
| FE 관측 | **@sentry/nextjs 10.34.0** + @sentry/browser | apps/web |
| FE DS | **@pullim/design-system** (github tag, 현재 `v0.1.0`) — Button/Card/Dialog/Input/Tabs/Heading/Text/toast(sonner 재export) | apps/web |
| FE 보조 | **Tiptap** (필요 도메인만 — classbot builder 후보), lottie-react, lucide-react, firebase, @tosspayments/tosspayments-sdk | apps/web |
| BE 프레임워크 | **NestJS 11** (common 11.0.1 + core + platform-express) + TypeScript | apps/backend |
| BE ORM | **TypeORM 0.3.28** + typeorm-naming-strategies + @nestjs/typeorm 11.0.0 | apps/backend |
| BE DB | **PostgreSQL** (pg 8.20.0) | apps/backend |
| BE 캐시 | **ioredis 5.10.0** | apps/backend |
| BE 인증 | **@nestjs/passport 11.0.5** + **@nestjs/jwt 11.0.2** + passport 0.7.0 + passport-jwt 4.0.1 + bcrypt 6.0.0 | apps/backend |
| BE Swagger | **@nestjs/swagger 11.2.6** | apps/backend |
| BE 스케줄 | @nestjs/schedule 6.1.1 | apps/backend |
| BE 로깅 | winston 3.19.0 + nest-winston 1.10.2 + morgan + helmet | apps/backend |
| BE 컨텍스트 | **nestjs-cls 6.2.0** (request-scoped context) | apps/backend |
| BE AWS SDK | **@aws-sdk/client-s3** 3.1032.0 + **client-ses** 3.1022.0 + s3-presigned-post + s3-request-presigner | apps/backend |
| BE 검증 | class-validator 0.15.1 + class-transformer 0.5.1 + joi 18.0.2 | apps/backend |
| BE 시간 | luxon 3.7.2 | apps/backend |
| BE HTTP | @nestjs/axios 4.0.1 + axios 1.15.0 | apps/backend |
| 패키지 빌드 정책 | `pnpm.onlyBuiltDependencies: ["@pullim/design-system", "bcrypt"]` | root package.json |

### 2-B. 별도 정책 제안 (repo 비검증 — 작성자 운영 의도)

> 아래 항목은 `curea-co/pullim` 저장소 코드로 직접 확인되지 않는다. 본체 패턴이 아니라 **5 도메인 운영 정책 제안**이며, 게이트 합의 전까지는 "정본"이 아니다. 마이그레이션 PR 은 본체 정합이 아니라 이 별도 정책을 근거로 삼는다는 점을 명시해야 한다.

| 영역 | 제안 값 | 출처 | repo 검증 여부 |
|---|---|---|---|
| BE 큐 (BullMQ) | BullMQ (도메인 작업 큐) | 작성자 운영 의도 | ❌ `curea-co/pullim` 본체에 BullMQ **직접 의존성 없음** — repo 미검증 |
| 배포 | AWS ECS Fargate + ECR + Secrets Manager + CloudWatch Logs + RDS + S3 + SES | 작성자 운영 의도 | ❌ 인프라 토폴로지는 코드 외 결정 (§8/§16 보류) |
| CI/CD | GitHub Actions → Docker build → ECR push → ECS service update | 작성자 운영 의도 | ❌ 배포 결정에 종속 (§16 보류) |
| dev ECS 서비스명 패턴 | `pullim-web-dev` / `pullim-backend-dev` | 작성자 운영 의도 | ❌ 인프라 확정 후 명명 |
| AWS 리전 | ap-northeast-2 | 작성자 운영 의도 | ❌ 인프라 확정 후 |

§2-A 가 5 도메인 정합의 **감사 가능한 기준선**이고, §2-B 는 별도 합의 트랙(특히 §16 인프라 보류)에 종속된 제안이다. §2-A 갱신은 본체 PR 머지 시점에 본 plan 을 먼저 정정한 뒤 5 도메인에 전파한다.

---

## 3. 5 도메인 현재 상태 매트릭스

각 도메인 `package.json` + `CLAUDE.md` 정독 결과 (**2026-05-27 작성 시점 스냅샷** — 후속 PR 은 *현 시점* 워크스페이스 재확인 필요):

| 항목 | planner | Q | classbot | games | arcade |
|---|---|---|---|---|---|
| **레포** | `curea-co/pullim-planner` | `curea-co/pullim-Q` | `curea-co/pullim-classbot` | `curea-co/pullim-games` | `curea-co/pullim-arcade` |
| **모노레포** | ✅ bun workspace + Turborepo | ✅ bun workspace + Turborepo | ❌ 단일 앱 (D-Lite 진행) | ❌ 단일 앱 (alignment PR #108 작성) | ✅ Turborepo 없음, 단일 앱 (D-Lite 머지) |
| **패키지 매니저** | bun 1.3.12 | bun 1.3.12 | bun | bun | bun |
| **Next.js** | 16 (apps/planner) | 16 (apps/q) | 16 | **15** (정본 ≠) | 16.2.4 |
| **React** | 19 | 19 | 19 | 19 | 19.2.4 |
| **BE** | NestJS 11 (common 차용, Cls만 진행 중) | NestJS 11 skeleton | skeleton | (없음) | skeleton |
| **DB** | Postgres 16 docker-compose | Postgres 16 docker-compose | Postgres + **drizzle-orm 0.36.4** (정본 ≠ TypeORM) | (없음) | Postgres docker-compose (host 5435) |
| **ORM** | TypeORM 예정 | TypeORM 예정 | **drizzle** (정본 ≠) | (없음) | (드라이버 pg 만) |
| **i18n** | (없음) | (없음) | (없음) | (없음) | (없음) |
| **DS** | shadcn/ui + Base UI (로컬, `@base-ui/react`) | shadcn 로컬 | shadcn 로컬 + sonner | shadcn (new-york/slate, 자체 토큰) | shadcn 4.4.0 |
| **TanStack Query** | (없음) | (없음) | ✅ 5.100.1 | (없음) | (없음) |
| **Sentry** | (없음) | (없음) | (없음) | (없음) | (없음) |
| **Redis** | (없음) | (없음) | (없음) | (없음) | (없음) |
| **BullMQ** | (없음) | (없음) | (없음) | (없음) | (없음) |
| **AWS SDK** | (없음) | (없음) | (없음) | (없음) | (없음) |
| **인증** | Mock | Mock | (보안 구현 미정 — bcryptjs 부재) | (없음) | bcryptjs 3.0.3 (정본 ≠ bcrypt) |
| **배포** | Vercel manual | Vercel manual | Vercel manual | Vercel manual | Vercel manual |
| **포트 dev** | 3030 | 3031 | 3032 | 3033 | 3040 |
| **권위 문서** | `input/docs-archive/08_풀림_플래너_핸드오프.md` (+ 루트 `CLAUDE.md` → `apps/planner/AGENTS.md`·`apps/planner/CLAUDE.md` 위임) | `input/docs-archive/*` | `input/docs-archive/07_클래스봇_핸드오프.md` | **`proc/spec/01~10`** (독립) | `proc/spec/` (작성 중) |
| **proc 5번째** | knowhow | knowhow | knowhow | **audit** (독립) | knowhow |
| **현재 진행** | Phase β PR #36 | D-Lite 머지 | D-Lite 진행 | alignment plan PR #108 | Phase 1 PR #2 머지 |

핵심 갭 (분류는 §4):
- **5 도메인 전체 — pnpm/i18n/Sentry/Redis/BullMQ/AWS SDK 0%**
- **classbot — drizzle 채택**: 정본 TypeORM 과 ORM 충돌 (가장 큰 단일 이슈)
- **classbot — bcryptjs ≠ bcrypt**: native bcrypt 로 전환 또는 본 plan 에서 예외 인정 결정 필요
- **games — Next.js 15**: 정본 16 과 한 단계 lag
- **games — BE 없음**: 5 중 유일 (BE 신설 vs 영구 SPA 결정 필요)
- **TanStack Query 보유는 classbot 만**: 정본 패턴이 아닌 채택임 (FE 데이터 계층 통합 시 일관성 확보 필요)

---

## 4. 갭 분석 (12 영역)

| # | 영역 | 정본 | 5 도메인 평균 | 갭 크기 | 도메인별 차이 |
|---|---|---|---|---|---|
| G1 | 패키지 매니저 | pnpm 10.26.1 | bun 1.3.12 | **L** (lockfile/Dockerfile/workflow 동시 갱신) | 5 도메인 동일 — 5건 일괄 |
| G2 | 모노레포 | Turborepo + apps/{web,backend} + packages/* | planner/Q/arcade 일부 / classbot·games 미완 | **M** | classbot/games 가 모노레포 전환 선행 필요 |
| G3 | Next.js | 16.1.2 | 16 (games 만 15) | **S** (games 만 1 단계) | games — Next 15 → 16 |
| G4 | BE 프레임워크 | NestJS 11 (common·config·database 표준 모듈) | planner/Q/classbot/arcade skeleton, games 부재 | **L** | games — BE 신설 결정 필요 |
| G5 | ORM | TypeORM 0.3.28 + naming-strategies | classbot drizzle, 나머지 미적용 | **L** | classbot — drizzle → TypeORM 마이그레이션 |
| G6 | 인증 | Passport/JWT + bcrypt | Mock 4건, arcade bcryptjs, games 없음 | **L** | 5건 모두 JWT 도입 |
| G7 | 캐시·큐 | Redis(ioredis) + BullMQ | 0건 | **L** | 5건 모두 신규 도입 |
| G8 | FE DS | @pullim/design-system + DS 강제 import | shadcn 로컬 5건 | **L** | 5건 모두 마이그레이션 + 본체 DS 외부 노출 정책 확정 필요 |
| G9 | FE i18n | next-intl + ko/en 단일 messages | 0건 (모두 한글 하드코딩) | **L** | 5건 모두 신규 도입, 텍스트 추출 비용 큼 |
| G10 | FE 데이터 | TanStack Query | classbot 만 보유 | **M** | 4건 신규 도입 + classbot 패턴 정합 |
| G11 | 관측 | Sentry (Next.js + browser 두 SDK) | 0건 | **M** | 5건 모두 신규 도입 |
| G12 | AWS SDK | client-s3 + client-ses + s3-presigned | 0건 | **M** | 사용처별 — 5 도메인 모두 즉시 필요한지 평가 후 |
| G13 | 배포 | AWS ECS Fargate + ECR + Secrets Manager + CW Logs | Vercel manual 5건 | **XL** (DNS/SSL/모니터링 재구성) | 5건 모두 전환, AWS cluster 결정 §8 |
| G14 | CI/CD | GitHub Actions → Docker → ECR → ECS update | Vercel 자동 비활성, manual | **L** | 5건 모두 신규 작성 |
| G15 | 패키지 분리 | packages/{types,api-client,auth} + (본체엔 analytics/config/logging/remote-config/ui) | placeholder 3건 (planner/Q), classbot·games 부재 | **M** | 5건 모두 packages 6개로 정렬 |

총 12+ 영역 갭. P0/P1/P2 분류는 §6.

---

## 5. 비목표 (Scope Out)

본 plan **범위 외**:

| # | 비목표 | 이유 |
|---|---|---|
| N1 | pullim 본체로의 흡수·코드 이관 | 본 plan 의 핵심 전제 — 본체 흡수 아님. 별 트랙(향후 도메인별 흡수 plan)에서 다룸 |
| N2 | 5 도메인 간 데이터 공유 (cross-domain user/auth/payments 등) | 5 모두 별도 RDS·schema 유지. 데이터 공유는 §9 RDS 결정 + 별 plan |
| N3 | studio / store 작업 | 사용자 컨트롤타워 범위 외 (본체 monorepo 안의 모듈) |
| N4 | games 자체 SPEC 폐기 | games 자율성 보존 — `proc/spec/01~10` + `audit/` 패턴 유지. 본 plan 은 인프라·스택만 정렬 |
| N5 | bun → pnpm 전환을 게이트키퍼 합의 없이 강행 | G3 합의 필요 (§12) |
| N6 | Vercel 무중단 전환 보장 | 도메인 cutover 는 maintenance window 가 정상 패턴. SLA 정의는 별 plan |
| N7 | 5 도메인의 도메인 모델 통합 (user/account/payment 통합) | 데이터 흡수 트랙 — 본 plan 은 구조 인프라만 |
| N8 | 본체 `@pullim/design-system` 의 5 도메인 외부 공개 정책 | 본체팀 결정 사안 — 본 plan §11 R-DS 리스크에 반영, 본체팀과 협의 |

---

## 6. Phase 분할 — P0 / P1 / P2

### P0 — 인프라·구조 토대 (블로커성 — 다른 모든 Phase 의 전제)

| Phase | 이름 | 대상 | 산출물 |
|---|---|---|---|
| **P0-1** | bun → pnpm 전환 | 5 도메인 일괄 | bun.lock 삭제·pnpm-lock.yaml 생성, `packageManager: "pnpm@10.26.1"`, scripts `bun --filter` → `pnpm -C` 또는 `pnpm --filter`, `predev`의 `bun run` → `pnpm`, Dockerfile pnpm 베이스, CI workflow pnpm/action-setup |
| **P0-2** | AWS ECS Fargate 셋업 | 5 도메인 또는 공유 cluster | cluster·service·task definition·ALB·target group·security group. cluster 옵션은 §8 결정 후 |
| **P0-3** | RDS PostgreSQL 셋업 | 5 도메인 또는 공유 RDS | RDS 인스턴스·VPC·subnet group·parameter group·migrations. RDS 옵션은 §9 결정 후 |
| **P0-4** | CI/CD 재작성 (Vercel 폐기 → Docker → ECR → ECS) | 5 도메인 각자 | `.github/workflows/{ci.yml,deploy.yml}`: actions/setup-pnpm·typecheck·lint·test → docker build → aws-actions/configure-aws-credentials → ECR push → ECS service update |
| **P0-5** | Secrets Manager + CloudWatch Logs + S3 + SES | 5 도메인 또는 공유 | env 추출·Secrets Manager rotation policy·로그 그룹·S3 버킷 정책·SES verified identity |

### P1 — 코드 마이그레이션 (단계별 진입 조건 상이 — 아래 주의)

> ⚠ **순서 정정**: P1 전체가 "P0 완료 후"는 아니다. §13-A·§14-A 대로 **P1-1(JWT)·P1-2(Redis/BullMQ)의 코드 레벨 작업(9c/10c)** 은 인프라 보류와 분리되어 (각 리포 scope-out 해제 후) **선행 가능**하다. 반면 **인프라 의존 배포 단계(P1-1/P1-2 의 배포 측면, §13-B 9/10)는 P0(특히 §16.3 트리거) 이후**다. P1-3/4/5(FE) 는 G4 + 권위 문서 갱신 후. 아래 표는 산출물 정의이며 진입 순서는 §13/§14 를 따른다.

| Phase | 이름 | 대상 | 산출물 |
|---|---|---|---|
| **P1-1** | Passport/JWT 인증 도입 | 5 도메인 | MockAuth → @nestjs/passport + @nestjs/jwt, refresh token rotation, bcrypt password hashing. classbot·arcade 의 bcryptjs → bcrypt 전환 |
| **P1-2** | Redis + BullMQ 도입 (BE) | 5 도메인 | ioredis connection, BullMQ queue 셋업, ElastiCache 또는 Redis container 모두 |
| **P1-3** | shadcn/ui(+Base UI) 로컬 → @pullim/design-system 마이그레이션 (FE) | 5 도메인 | Button/Card/Dialog/Input/Tabs/Heading/Text/toast import 전환, lucide-react → @pullim/design-system/icons, sonner → @pullim/design-system. **planner 는 `@base-ui/react` 의존 복합 컴포넌트도 범위 포함**(권위: `apps/planner/AGENTS.md`·`apps/planner/CLAUDE.md`). 도메인별 GitHub Action으로 release tag 핀 |
| **P1-4** | next-intl 도입 (i18n) | 5 도메인 | `messages/{ko,en}.json` 단일 파일, `useTranslations()` / `getTranslations()` 적용, 하드코딩 텍스트 전수 추출. mock 데이터의 한글은 예외 |
| **P1-5** | TanStack Query 도입 (FE 서버 state) | 4 도메인 (classbot 제외 — 이미 보유) | QueryClient provider, hydration boundary, queryKey 컨벤션 |

### P2 — 추가 도입 (P1 완료 후, 도메인 필요도별)

| Phase | 이름 | 대상 | 산출물 |
|---|---|---|---|
| **P2-1** | Sentry 도입 | 5 도메인 | `instrumentation.ts` + sentry.client/server/edge.config.ts, DSN Secret 관리 |
| **P2-2** | AWS SDK (S3 / SES) 도입 | 사용처별 (classbot 봇 미디어, planner 리포트 PDF, Q 학습 자료 등) | presigned URL 패턴, SES verified sender |
| **P2-3** | Tiptap 도입 | classbot builder, planner 메모 (필요 도메인만) | @tiptap/react + extensions |
| **P2-4** | packages 6개 정렬 (analytics/config/logging/remote-config/ui/utils) | 5 도메인 각자 | placeholder → 실제 구현, types/api-client/auth 기존 3 + 신규 3 |
| **P2-5** | Next.js 15 → 16 (games 한정) | games | next major bump, app router 검증, 21 게임 회귀 |

**총 Phase 수**: P0=5, P1=5, P2=5 → **15 Phase**

---

## 7. 도메인별 적용 매트릭스

각 도메인이 어디서 출발해서 어디까지 가는지:

| Phase | planner (Phase β 진행) | Q (D-Lite 머지) | classbot (D-Lite 진행) | games (alignment PR #108) | arcade (Phase 1 머지) |
|---|---|---|---|---|---|
| P0-1 pnpm | 신규 적용 | 신규 적용 | D-Lite 모노레포 전환과 합쳐 1 PR | alignment plan 의 Phase 0a 로 흡수 | 신규 적용 |
| P0-2 ECS | 신규 적용 | 신규 적용 | 신규 적용 | BE 신설 + ECS 동시 (§8 결정) | 신규 적용 |
| P0-3 RDS | 기존 docker compose → RDS | 기존 docker compose → RDS | drizzle 분리 결정 + RDS | 신규 (BE 신설 시) | 기존 docker compose → RDS |
| P0-4 CI/CD | Vercel workflow 폐기 | Vercel workflow 폐기 | Vercel workflow 폐기 | Vercel workflow 폐기 + codex-review.yml 유지 | Vercel workflow 폐기 |
| P0-5 Secrets·Logs·S3·SES | 신규 적용 | 신규 적용 | 신규 적용 | 신규 적용 | 신규 적용 |
| P1-1 JWT | Phase γ 의 BE 도입 시점 | BE 본격 시점 | bcryptjs → bcrypt + JWT | BE 신설 시 신규 | bcryptjs → bcrypt + JWT |
| P1-2 Redis·BullMQ | BE 신규 | BE 신규 | BE 신규 + drizzle 호환성 검토 | BE 신설 시 | BE 신규 |
| P1-3 DS | shadcn/ui 28+ **+ Base UI(`@base-ui/react`)** 컴포넌트 마이그레이션 — Base UI 의존 복합 컴포넌트도 범위 포함 | shadcn 마이그레이션 | shadcn 마이그레이션 + sonner | shadcn (new-york/slate) → DS (시각 회귀 위험 — `bun run ui:audit` 4 viewport 필수) | shadcn 마이그레이션 |
| P1-4 i18n | hard-coded 한글 추출 (planner-home/reports/manage/onboarding 28+ 컴포넌트) | hard-coded 한글 추출 (q/{infinity,talk,analysis,review}) | hard-coded 한글 추출 (classbot/builder 13 파일) | hard-coded 한글 추출 (21 게임 + 셸 + 메커니즘) — **mock 한글 데이터는 예외 컨벤션 적용** | placeholder 라 비용 작음 |
| P1-5 TanStack Query | 신규 | 신규 | **이미 보유 (5.100.1)** — 정본 5.90.21 과 minor 호환 확인 | 신규 (BE 신설 시) | 신규 |
| P2-1 Sentry | 신규 | 신규 | 신규 | 신규 | 신규 |
| P2-2 AWS SDK | 리포트 PDF S3 + 이메일 알림 SES | 학습 자료 S3 | 봇 미디어 S3 + 알림 SES | (사용처 평가 후 — 게임 콘텐츠 이미지는 정적 호스팅으로 우선) | 사용처 평가 후 |
| P2-3 Tiptap | 메모/회고 영역 가능성 | (미적용 후보) | **봇 빌더 핵심** — 우선 도입 | (미적용 — 게임은 인터랙션 위주) | (미적용) |
| P2-4 packages 6개 | placeholder 3 → 실 구현 + 3 추가 | placeholder 3 → 실 구현 + 3 추가 | 모노레포 전환 후 packages 신설 | 모노레포 전환 후 packages 신설 | packages 신설 |
| P2-5 Next 15 → 16 | (해당 없음) | (해당 없음) | (해당 없음) | **단독 Phase** — 21 게임 회귀 audit (`proc/audit/`) 필수 | (해당 없음) |

---

## 8. AWS 인프라 결정 — **§16.2/§16.3 에 의해 보류(superseded)**

> ⚠ **상태 갱신**: 본 절의 '미해결 즉시 결정' 프레이밍은 §16.2(D-CLU 무기한 보류)·§16.3(병합 토폴로지 확정 전 P0-2 진입 불가)·§16.5 에 의해 **대체되었다**. 아래 옵션 비교표와 PM 권장(옵션 C)은 **보류 해제 시점에 참고할 후보**로만 남기며, 지금 결정해야 하는 안건이 아니다. 후속 PR 은 §16 을 기준으로 삼는다.

5 도메인을 어떤 AWS 토폴로지로 운영할 것인가 (보류 해제 후 검토):

| 옵션 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **A** | 5 도메인 각자 ECS cluster | 완전 독립. 한 도메인 장애 → 다른 도메인 무영향. 비용 분리 정확 | NAT Gateway·ALB·VPC 5x 비용. 운영 부담 5x |
| **B** | 공유 cluster `pullim` + 도메인별 service | 본체와 같은 cluster. NAT/ALB 공유로 비용 효율 | "본체 흡수 아님" 원칙과 운영 경계 충돌. 본체 incident 가 5 도메인 전파 |
| **C** | 신규 공유 cluster `pullim-domains` + 도메인별 service | 본체와 분리 + 5 묶음. 비용 효율 + 본체 격리 | cluster 1 추가 운영. 5 도메인 cross-team 권한 정책 필요 |

**권장 후보 (보류 해제 후 참고)**: 옵션 C. 본체 격리 의도와 비용 효율의 절충. 도메인별 service 라 무중단 deploy 와 capacity 독립.
**결정자**: G1 + G3 (BE 게이트키퍼).
**결정 시점**: ~~P0-2 시작 전~~ → **§16.3 트리거(병합 안 함 확정 또는 토폴로지 확정) 충족 후**. §15 D-CLU 도 §16.2 로 보류 처리됨.

---

## 9. RDS 결정 — **§16.2/§16.3 에 의해 보류(superseded)**

> ⚠ **상태 갱신**: §8 과 동일하게 §16.2(D-RDS 보류)·§16.3 에 의해 **대체되었다**. 아래 옵션·권장(옵션 B)은 보류 해제 후 참고 후보일 뿐, 지금 결정 안건이 아니다.

5 도메인 RDS 운영 방식 (보류 해제 후 검토):

| 옵션 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **A** | 5 도메인 각자 RDS instance | 완전 독립. 백업·튜닝·major upgrade 도메인별 자율 | 비용 5x. Aurora Serverless 도 최소 비용 누적 |
| **B** | 공유 RDS instance + DB 분리 (database-per-domain) | 비용 절약. 인스턴스 1 운영 | RDS connection 한계, IOPS 경합 |
| **C** | 공유 RDS + 공유 DB + schema 분리 (schema-per-domain) | 최저 비용. cross-domain JOIN 가능 | schema migration 충돌. 도메인 격리 약화 — "본체 흡수 아님" 원칙과 충돌 |

**권장 후보 (보류 해제 후 참고)**: 옵션 B. 비용 절약 + 도메인 격리 보존. 인스턴스는 1 이지만 DB 가 분리되어 권한·dump 도 분리 가능.
**결정자**: G1 + G3.
**결정 시점**: ~~P0-3 시작 전~~ → **§16.3 트리거 충족 후**. §15 D-RDS 도 §16.2 로 보류 처리됨.

---

## 10. 출시 우선순위 — 트랙1(착수 가능) / 트랙2(§16 보류) 분리 (아래 권장 참조)

5 도메인 마이그레이션을 어떻게 시퀀싱:

| 옵션 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **A** | 5 도메인 동시 P0-1 → 동시 P0-2 → ... 5-track 병렬 | 본체팀 1 단계씩 같이 굴림. 컨벤션 표류 zero | 5 도메인 동시 PM/AI 리소스. 한 도메인 막히면 모두 막힘 |
| **B** | 1 도메인 끝까지 (P0~P2 전부) → 다음 도메인 | 한 도메인의 회고로 다음 도메인 개선. 리소스 집중 | 5 도메인 합류 시점 컨벤션 표류 위험 |
| **C** | 우선 도메인(planner) 선행 → 회고 후 4 도메인 병렬 | 1 도메인 학습 + 4 도메인 병렬의 절충 | 1 도메인이 끝나는 데까지 4 도메인 대기 |

**권장 (PM 의견)**: 옵션 C 의 *학습-선행* 골격(planner 1 선행 → 회고 → 나머지 병렬)은 유지하되, **§16 보류 결정에 맞춰 P0 진입 시점을 다시 적는다**.

> ⚠ **§16 정합 — 인프라 의존 P0 는 현재 진입 불가**: §16.2/§16.3 는 병합 토폴로지 확정 전까지 **P0-2(ECS)/P0-3(RDS)/P0-4(CI/CD) 진입 자체를 보류**한다. 따라서 "P1-1 머지 후 4 도메인 일제 P0 시작" 같은 실행 시퀀스는 현재 **성립하지 않는다**. 시퀀싱은 다음 두 트랙으로 분리한다:
>
> - **트랙 1 — 인프라 비의존(단, 기존 채택 plan 대체 합의 선행 필요)**: P0-1(pnpm) 은 인프라 결정과 무관하다는 점에서만 트랙 2 와 구분된다. **그러나 "즉시 진행 가능"이 아니다.** planner 의 현행 정본 `proc/plan/2026-05-26_pullim-be-adoption.md` 는 **`bun 유지`** 를 못박고(bun+Nest 호환성 실패 시에만 backend 를 node+pnpm 으로 분기), pnpm 전환은 그 채택 plan 을 **대체**하는 행위다. 따라서 P0-1 은 G3 승인 **이전에** 각 리포(특히 planner)의 기존 채택 plan 을 대체하는 별도 합의 + spec/plan 갱신 PR 이 선행되어야 진입 가능하다. 옵션 C 골격(planner 선행 → 회고 → 나머지)은 그 선행 합의가 끝난 뒤의 실행 순서일 뿐이다.
> - **트랙 2 — 보류 (인프라 의존)**: P0-2/3/4/5 및 그에 종속된 P1-1(JWT)·P1-2(Redis/BullMQ) 의 *배포 측면*은 §16.3 트리거((a) 병합 안 함 확정 또는 (b) 토폴로지 확정) 충족 시에만 진입. 진입 순서는 그 시점에 옵션 C 골격으로 재확정한다.

**결정자**: G1(일정) — 단, 트랙 2 진입 자체는 §16.3 트리거 + G3 가 선행.
**결정 시점**: 트랙 1 은 본 plan 합의 + G3 승인 시점. 트랙 2 는 §16.3 트리거 충족 시점.

---

## 11. 리스크 매트릭스

| # | Phase | 리스크 | 영향 | 완화 |
|---|---|---|---|---|
| R-PM | P0-1 | bun → pnpm 전환: lockfile/Dockerfile/CI 동시 갱신 누락 시 dev 환경 폭발 | M | 1 PR 에 lockfile·Dockerfile·workflow 모두 묶기. checklist PR template |
| R-VRC | P0-4 | Vercel → ECS: 도메인 cutover 시 DNS·SSL·모니터링 재구성 | H | maintenance window 사전 공지. Route53 alias TTL 단축 → ALB 전환 → TTL 복구 |
| R-AUT | P1-1 | Mock → JWT: 토큰 발행/검증/refresh 흐름 신설, 기존 mock user 일관성 깨짐 | H | MockAuthProvider 인터페이스 유지 → JwtAuthProvider 구현으로 교체. `IAuthProvider` 추상화는 planner 가 packages/auth 에 이미 placeholder |
| R-DS | P1-3 | shadcn → DS: UI 시각 회귀 (특히 games 의 toolset/spacing/border-radius 룰) | H | games 는 `bun run ui:audit` 4 viewport (320/390/768/1280) 머지 전 필수. critical overflow 0 까지 fix |
| R-I18N | P1-4 | i18n 추출: 모든 텍스트 마이그레이션 — 시간 큼 (planner 28+, games 21 게임 + 셸) | H | 도메인별 별 PR. mock 데이터 한글 예외 컨벤션 (apps/web/CLAUDE.md 명시). `useTranslations` 검사 lint rule 도입 |
| R-TQ | P1-5 | TanStack Query: 데이터 패칭 일괄 전환. classbot 만 보유 → version drift | M | classbot 5.100.1 → 정본 5.90.21 호환성 확인. queryKey 컨벤션 5 도메인 통일 |
| R-DS-EXT | P1-3 | `@pullim/design-system` 외부 노출 정책: 본체팀 발행·버전·breaking change 정책 부재 | H | 본체팀과 별 합의 PR — `@pullim/design-system` GitHub release tag pin 정책 + semver + 5 도메인 향한 deprecation lead time. 본 plan §8/§9 와 동급 미해결 |
| R-DRIZ | P0-3 | classbot drizzle → TypeORM: schema 재작성. 기존 drizzle migrations 폐기 | H | classbot drizzle 보유분 SQL dump → TypeORM entities 재생성 + migration 첫 generate. data preserving plan 필요 |
| R-N15 | P2-5 | games Next 15 → 16: 21 게임 회귀 | M | major bump 별 PR. games §7 (`audit/` 트리거 T5 메이저 의존성) 자동 발동 |
| R-AWS-COST | P0-2/3/5 | AWS 청구 폭증 (5 도메인 RDS+ECS+ALB+CloudWatch) | M | 옵션 B(RDS 공유) + 옵션 C(cluster 공유) 권장 §8/§9. CW Logs retention 7d, S3 lifecycle policy |
| R-SECRETS | P0-5 | Secrets Manager: rotation 누락·DB password drift | M | terraform 또는 CDK 로 IaC. rotation lambda는 P0-5 후속 |
| R-BMQ | P1-2 | BullMQ: 기존 BE 에 큐 없음 → 단순 도입 (큰 리스크 아님). 단 producer/consumer 분리 시점 결정 필요 | L | 도메인별 큐 prefix (`planner:`/`q:`/`classbot:` 등) Redis 공유 시 충돌 방지 |
| R-S3-CDN | P2-2 | S3 public + CloudFront 또는 presigned URL 정책 미정 | M | 도메인별 결정. games 게임 콘텐츠 이미지는 CDN, classbot 봇 미디어는 presigned |
| R-OPS | 전체 | 5 도메인 운영 + 본체 운영 = AI 리소스 6 트랙. PM 단독 운영 한계 | H | §10 옵션 C (planner 선행 + 4 병렬) 채택 시 PM 1주차 = 1 트랙, 2주차 = 4 트랙. AI 컨트롤타워는 PM proxy |
| R-COD | P1-3, games | codex review (games 의 거버넌스 §9) 와 본 plan 의 패키지 추가 충돌 | L | games AGENTS.md 의 "Codex Review 회피 금지" 룰 준수. spec/09 §9.1 의 Next.js 표준 채택 룰 + 본 plan 의 next 16 정합은 spec/09 갱신 트랙으로 정리 |

---

## 12. 게이트키퍼 합의 포인트

| Gate | 합의 시점 | 합의 대상 |
|---|---|---|
| **G1** (현재 — 보류 중) | 본 plan 통과 + §10 트랙1 합의 (P0-1 선행) | 트랙1 시퀀스·정책. ⚠ §8/§9/§10 의 인프라 결정(ECS/RDS/시퀀스)은 §16.2/§16.3 으로 **보류**되어 지금 G1 합의 대상이 아니다 |
| **G1** (보류 해제 후) | §16.3 트리거 충족 후 | 확정 토폴로지 기준 5 도메인 동시 마이그레이션 정책, 비용 (이전 §8/§9/§10 후보안 참고) |
| **G3** (BE·인프라) | **P0-1 (pnpm 전환)** + (보류 해제 후) P0-2/3 결정 + P1-1·P1-2 시작 | **pnpm 전환 (lockfile/Dockerfile/CI 툴링)**, (§16.3 후) AWS 토폴로지·RDS 옵션·JWT 흐름·Redis/BullMQ |
| **G4** (FE) | P1-3·P1-4·P1-5 시작 | DS 마이그레이션 베이스라인 (특히 games 시각 회귀), i18n 추출 정책, TanStack Query 컨벤션 |

> **승인 라우팅 단일 고정**: P0-1 (bun → pnpm) 의 승인 게이트는 **G3** 하나다 (§0 패배 사례·N5 와 동일). FE 전용 G4 또는 일정 사안 G1 이 아니다. 후속 PR 은 G3 승인자를 태운다.

각 Phase 시작 PR 에 합의 게이트키퍼 명시.

---

## 13. PR 분할 제안 — 15+ PR (착수 가능 / 보류 두 트랙)

> §16.3(P0-2/3/4 진입 보류)·§14-A 권위 문서 갱신 선행 조건에 맞춰, 아래 표를 **두 트랙으로 구분**한다. `🔒` 표시 PR 은 트리거/선행 합의가 충족되기 전에는 **착수 불가**다 — 일반 실행 순서로 오독하지 말 것 (codex 지적).

### 13-A. 선행 합의 완료 시 착수 가능 트랙 (인프라 비의존 — 현재는 합의/권위 갱신 대기)

> ⚠ 이 트랙의 PR 도 **지금 바로 열 수 없다**. §10 트랙1 대로 각 리포(특히 planner — `proc/plan/2026-05-26_pullim-be-adoption.md` 의 `bun 유지`)의 **기존 채택 plan 대체 합의 + spec/권위문서 갱신**이 선행되어야 한다. 인프라(§16.3)에는 의존하지 않는다는 점에서만 13-B 와 구분된다.

| PR # | Phase | 도메인 | 제목 (안) | 의존 / 선행 조건 |
|---|---|---|---|---|
| 1 | P0-1 | planner | `chore(planner): bun → pnpm 10.26.1 전환` | **선행: §10 트랙1(기존 bun 유지 plan 대체 합의 + spec 갱신) + G3 승인** |
| 2 | P0-1 | Q | `chore(q): bun → pnpm 10.26.1 전환` | PR1 회고 + (도메인별 동일 선행) |
| 3 | P0-1 | classbot | `chore(classbot): D-Lite 모노레포 + pnpm 동시 적용` | PR1 회고 + (동일 선행) |
| 4 | P0-1 | games | `chore: bun → pnpm + alignment 흡수` | PR1 회고 + (동일 선행) |
| 5 | P0-1 | arcade | `chore: bun → pnpm 10.26.1` | PR1 회고 + (동일 선행) |
| 9c | P1-1(코드) | 5 도메인 | `feat(<scope>): JWT 인증 **코드 레벨** 구현 (로컬 docker 검증)` | 각 리포 scope-out 해제(§14-A) — 인프라 비의존. **배포 측면(PR9)은 13-B** |
| 10c | P1-2(코드) | 5 도메인 | `feat(<scope>): Redis/BullMQ **코드 레벨** 구현 (로컬 docker 검증)` | 각 리포 scope-out 해제(§14-A) — 인프라 비의존. **배포 측면(PR10)은 13-B** |

### 13-B. 보류 트랙 (🔒 §16.3 트리거 또는 권위 문서 갱신 후에만 착수)

| PR # | Phase | 도메인 | 제목 (안) | 의존 / 차단 조건 |
|---|---|---|---|---|
| 6 | P0-2/3 | (인프라) | `infra: ECS cluster + RDS 셋업` | 🔒 **§16.3 트리거(병합 안 함 확정 또는 토폴로지 확정) 충족 후** |
| 7 | P0-4 | 5 도메인 | `ci(<scope>): Vercel → Docker → ECR → ECS workflow` (5 PR) | 🔒 PR6 (§16.3 트리거 후) |
| 8 | P0-5 | 5 도메인 | `infra(<scope>): Secrets Manager + CloudWatch + S3 + SES` | 🔒 PR6 (§16.3 트리거 후) |
| 9 | P1-1 | 5 도메인 | `feat(<scope>): JWT 인증 **배포 측면** (Secrets/ECS env/실인증 연동)` (5 PR) | 🔒 PR8 + §16.3 트리거 후. **코드 레벨은 13-A 의 9c** |
| 10 | P1-2 | 5 도메인 | `feat(<scope>): Redis/BullMQ **배포 측면** (ElastiCache/연결 인프라)` (5 PR) | 🔒 PR8 + §16.3 트리거 후. **코드 레벨은 13-A 의 10c** |
| 11 | P1-3 | 5 도메인 | `refactor(<scope>): shadcn(+Base UI) → @pullim/design-system 마이그레이션` (5 PR — games 는 4 viewport audit 첨부) | 🔒 DS 외부 정책 합의 + 각 리포 앱 가이드의 DS 금지 해제(§14-A) |
| 12 | P1-4 | 5 도메인 | `feat(<scope>): next-intl ko/en 도입 + 텍스트 추출` (5 PR) | 🔒 각 리포 i18n 금지 해제(§14-A) |
| 13 | P1-5 | 4 도메인 | `feat(<scope>): TanStack Query 도입` (4 PR — classbot 제외) | (FE — 권위 문서 갱신 후 G4) |
| 14 | P2-1 | 5 도메인 | `feat(<scope>): Sentry instrumentation` (5 PR) | 🔒 각 리포 Sentry 도입 합의 후 |
| 15 | P2-* | 도메인별 | AWS SDK / Tiptap / packages / Next16 등 | 각 항목 선행 조건별 |

총 **30+ 개별 PR** 예상 (5 도메인 × 6 Phase 기본 + 도메인별 별도). 단 13-B 는 차단 조건 해제 전까지 작성 보류.

---

## 14. 본 plan 완료 정의

§16 의 인프라 무기한 보류 때문에, 단일 완료 정의(ECS/ECR/RDS 파이프라인 운영 요구)는 현재 **달성 불가능**하다 — 그대로 두면 archive 조건이 영원히 충족되지 않는다. 따라서 완료 정의를 **두 단계로 분리**한다 (codex 지적 반영).

### 14-A. 부분 완료 — 인프라 보류 전제 (현재 달성 가능)

§16.2/§16.3 보류가 유지되는 동안의 완료 기준. 인프라(ECS/ECR/RDS)에 의존하지 않는 항목만 포함한다. 본 단계 충족 시 plan 을 **"부분 완료(인프라 대기)" 상태로 표시**하되 archive 이관은 보류한다.

- [ ] 5 도메인 `package.json` 의 `packageManager` 가 `pnpm@10.26.1` (P0-1, G3 승인 후)
- [ ] 5 도메인 코드·디렉터리·로컬 툴링이 본체와 동형 — **typecheck/lint/test 게이트만** (인프라 비의존). ⚠ CI **배포** workflow(Vercel→Docker→ECR→ECS, P0-4)는 §10/§16.3 으로 보류되므로 본 항목에서 제외하고 14-B 로 이관한다.
- [ ] **(권위 문서 갱신 선행 필수)** 5 도메인 모두 `@pullim/design-system` 사용 + `messages/{ko,en}.json` 단일 파일 + TanStack Query QueryClient 활성 — ⚠ planner 의 `apps/planner/AGENTS.md`·`apps/planner/CLAUDE.md` 와 `proc/plan/2026-05-26_container-presenter-adoption.md` 는 **현재 `@pullim/design-system`·`next-intl`/`useTranslations()` 도입을 금지·별도 plan 분리**로 두고 있다. 따라서 이 항목은 각 리포의 앱 가이드/spec 을 먼저 갱신해 금지를 해제(G4 승인 + spec 갱신 PR 머지)한 뒤에만 체크 가능하다. 갱신 전에는 본 항목을 진행률에 포함하지 않는다.
- [ ] **(권위 문서 갱신 선행 필수)** JWT 인증 + Redis 연결의 **코드 레벨** 구현 (로컬 docker 검증) — ⚠ planner 의 `proc/plan/2026-05-26_pullim-be-adoption.md` 는 **Mock auth 유지 + JWT/Redis/BullMQ scope-out** 을 명시한다. 이 항목도 각 리포 spec/plan 갱신으로 scope-out 을 해제한 뒤에만 체크 가능하며, 배포 측면은 14-B 로 이관한다. 갱신 전에는 진행률에 포함하지 않는다.
- [ ] §11 의 인프라 비의존 H 리스크(R-AUT, R-DS, R-I18N, R-DS-EXT, R-DRIZ) mitigation 적용 또는 별 plan 이관

### 14-B. 최종 완료 — 병합 토폴로지 확정 후 (§16.3 트리거 충족 시)

§16.3 트리거((a) 병합 안 함 확정 또는 (b) 토폴로지 확정) 가 충족되어 인프라 보류가 해제된 뒤의 완료 기준. 본 단계까지 충족해야 **`archive/` 이관** — PM 명시 시점에:

- [ ] 14-A 전 항목 충족
- [ ] 확정된 토폴로지 기준으로 5 도메인 ECS Fargate dev 서비스 운영
- [ ] 5 도메인 모두 CI **배포** workflow(Vercel→Docker→ECR→ECS, P0-4 — 14-A 에서 이관) 정렬 + GitHub Actions → ECR → ECS 파이프라인 통과
- [ ] 5 도메인 모두 JWT 인증 + Redis 연결 + Sentry DSN **배포 환경** 활성
- [ ] §8/§9/§10 + §16.2 D-CLU/D-RDS/D-SEQ/D-COST 결정 사항이 **본 plan 본문(§16 결정 이력 포함)** 에 반영 — 결정 이력은 본 문서 §16 또는 동일 리포 `proc/` 내 문서에 누적한다. (리포 외부 `.pullim-meta/DECISIONS.md` 는 비권위 메모이므로 완료 조건의 근거로 삼지 않는다 — 본 바이블이 각 리포에 복제되어도 리포 단위로 검증 가능해야 함.)
- [ ] §11 의 인프라 의존 H 리스크(R-VRC, R-AWS-COST 등) mitigation 적용 완료 또는 잔여 리스크 별 plan 으로 이관

---

## 15. 초안 당시 결정 후보 (대부분 §16 에 의해 보류/대체)

> 본 표는 2026-05-27 초안 시점의 '결정 필요 사안' 후보다. **즉시 결정 안건이 아니다** — 아래 `현재 상태` 열을 기준으로 읽을 것. §16.2/§16.3 가 인프라·시퀀스 사안을 보류했으므로, 보류 행은 §16 이 대체(superseded)했다.

| # | 사안 | 결정자 | 현재 상태 | 권장안(보류 해제 후 참고) |
|---|---|---|---|---|
| **D-CLU** | AWS ECS cluster 토폴로지 (옵션 A/B/C) | G1 + G3 | 🔒 **§16.2 가 대체 — 무기한 보류** | 옵션 C — 신규 공유 cluster `pullim-domains` |
| **D-RDS** | RDS 운영 방식 (옵션 A/B/C) | G1 + G3 | 🔒 **§16.2 가 대체 — 보류** | 옵션 B — 공유 instance + DB 분리 |
| **D-SEQ** | 출시 시퀀스 (옵션 A/B/C) | G1 | 🔒 **§16.2 가 대체 — cluster 결정 후** (§10 트랙 분리 참조) | 옵션 C — planner 선행 → 4 도메인 병렬 |
| **D-DS** | `@pullim/design-system` 외부 노출·발행·deprecation 정책 | 본체팀 + G4 | 보류 — 본체팀 합의 필요 (§16.2) | GitHub release tag pin + semver + deprecation lead time 1 sprint |
| **D-CB-ORM** | classbot drizzle → TypeORM 전환 방식 (data migration) | G3 | 보류 — Phase γ 진입 시 (§16.2) | drizzle schema SQL dump → TypeORM entities 재생성 + 첫 migration generate |
| **D-GM-BE** | (해당 도메인) BE 신설 여부 (5 중 유일 BE 없음) | G1 + G3 | **§16.2 에서 결정 완료 (대체)** — 'SPA 유지는 옵션' 무효, 최신 결정은 §16.2 | (자체 NestJS 신설) |
| **D-GM-N16** | games Next 15 → 16 시점 | G4 + games audit T5 | 보류 — 진행 중 PR 마무리 후 (§16.2) | P1 완료 후 별 PR. 21 게임 회귀 audit 필수 |
| **D-COST** | 월 AWS 청구 상한선 (CW Logs retention, S3 lifecycle, RDS 인스턴스 사이즈) | G1 | 🔒 **§16.2 가 대체 — AWS 계정 셋업 후** | retention 7d, S3 90d → IA → 1y Glacier, RDS db.t4g.small 시작 |

---

## 부록 A — 참고 경로 (리포 상대)

> 모두 작성자 로컬 절대경로가 아닌 **리포 식별자 + 리포 내 상대경로** 로 기록. 후속 협업자가 GitHub UI 또는 동일 checkout 으로 재현 가능해야 한다.

- 본체: `curea-co/pullim` 의 `package.json`, `apps/web/package.json`, `apps/backend/package.json`
- 본체 컨벤션: `curea-co/pullim` 의 `apps/web/CLAUDE.md`, `apps/backend/CLAUDE.md`
- 5 도메인 컨벤션: 각 리포의 루트 `CLAUDE.md` **+ 루트가 위임하는 앱별 가이드**. 특히 planner 는 루트 `CLAUDE.md` 가 FE 상세 규칙을 `apps/planner/AGENTS.md`·`apps/planner/CLAUDE.md` 로 위임하므로, 루트만 보면 DS/i18n/Sentry 금지 같은 **앱 레벨 제약을 놓친다**. 참고 경로는 반드시 루트 + 앱별 가이드를 함께 따라가야 한다. (다른 도메인도 루트가 앱별 문서로 위임하면 동일.)
- 공통 운영 룰: 별도 워크스페이스 외 메타 리포(`.pullim-meta`) — *본 plan 의 권위 출처 아님, 메모용*
- 표류 결정 이력: 동(同) `.pullim-meta/DECISIONS.md` — *메모용*
- planner BE 차용 plan: `curea-co/pullim-planner` 의 `proc/plan/2026-05-26_pullim-be-adoption.md`
- games alignment plan: `curea-co/pullim-games` PR #108 (대상)
- games 거버넌스: `curea-co/pullim-games` 의 루트 `AGENTS.md`, `proc/spec/09-기술-환경.md`

## 부록 B — 변경 이력

- 2026-05-27 신규 작성. 5 도메인 정본 스택 정렬 통합 plan 초안. §8/§9/§10 + 4 D-* **초안 당시 미해결**.
- 2026-05-29 정정. §16 사용자 결정 반영: **§8/§9 (AWS/RDS) 및 §15 의 D-CLU/D-RDS/D-SEQ/D-COST 를 §16.2/§16.3 으로 보류·대체(superseded)**. §0 권위 우선순위에 planner 앱 가이드 추가, §2 를 본체 검증값(2-A)/별도 정책 제안(2-B) 분리, P0-1 게이트 G3 단일 고정, §10/§13/§14 를 트랙1(인프라 비의존)/트랙2(보류) 분리, §13-B JWT/Redis 를 코드(9c/10c)/배포(9/10) 분리, planner DS 베이스라인 shadcn/ui+Base UI 반영. **상단 §0~§16 본문이 최신 상태이며, 본 이력 줄만 보고 초안 상태로 오해하지 말 것.**

---

## §16 — 사용자 결정 (2026-05-27 후속) — 명시적 보류 사항

### 16.1 진행 결정

| 결정 | 답 |
|---|---|
| 본 plan 배치 방식 | **옵션 B — 5 도메인 각 `proc/plan/` 에 바이블 배치** (분산 보관, 동기화 부담 인정. 추후 구조 변경 시 바이블로 작업 진행) |

### 16.2 명시적 보류 (사용자 직접 셋업 대기)

| ID | 사안 | 보류 이유 | 임시방편 |
|---|---|---|---|
| D-CLU (ECS cluster) | AWS ECS cluster **무기한 보류** (2026-05-29 사용자 재확인) | **추후 프로젝트 병합 가능성** 때문 — 지금 5 도메인 각자 ECS cluster 를 붙여도 병합 시 재마이그레이션 高확률. 비용·마이그레이션 부담 이중 발생 → 인프라 확정 자체를 보류 (§16.5) | **Vercel 임시 사용** (서버 배포 차질 시) |
| D-RDS | 동일 (cluster 결정과 동반) | 동일 — 병합 토폴로지 확정 전 RDS 인스턴스 분할/통합 결정 불가 | RDS 셋업 전까지 docker postgres 로컬 dev |
| D-SEQ | cluster 결정 후 | 동일 | — |
| D-DS (DS 외부 노출) | 본체팀 합의 필요 | 본체팀 외부 패키지 발행 정책 협의 | shadcn 유지 |
| D-CB-ORM | classbot drizzle → TypeORM 마이그레이션 | Phase γ 진입 시 결정 | drizzle 유지 |
| D-GM-BE | games BE 신설 | 이미 옵션 B (자체 NestJS) 결정됨 | — |
| D-GM-N16 | games Next 16 시점 | 진행 중 PR 마무리 후 | Next 15 유지 |
| D-COST | AWS 청구 상한 | AWS 계정 셋업 후 | — |

### 16.3 컨트롤타워 메모 — 다음 시점에 사용자에게 확인 요청

> ⚠ **AWS ECS 인프라는 "주소 확보"가 아니라 "프로젝트 병합 토폴로지 확정"이 선행 조건** (2026-05-29 갱신).
> 병합 여부·범위가 정해지기 전에는 P0-2/3/4 진입 자체를 보류한다. 다음 *둘 중 하나* 가 충족되면 사용자에게 알릴 것:
> - (a) 프로젝트 병합 계획이 **하지 않는 것으로** 확정 → 5 도메인 각자 ECS 셋업 진입 가능
> - (b) 프로젝트 병합 **토폴로지가 확정** (몇 개로 합치는지, 어느 도메인이 한 cluster 를 공유하는지) → 그 토폴로지에 맞춰 ECS/RDS 셋업 진입
>
> 충족 시 동시 해결: P0-2 ECS Fargate / P0-3 RDS / P0-4 CI/CD 전환 / §16.2 D-CLU·D-RDS·D-SEQ·D-COST.

### 16.5 인프라 보류의 구조적 근거 (2026-05-29 사용자 직접)

사용자 명시: **"AWS ECS 쪽은 추후 프로젝트 병합 가능성 때문에 지금 당장 우리만의 AWS ECS 클러스터를 붙인다고 해도 다시 마이그레이션이 필요한 가능성이 매우 높아. 그래서 이건 여전히 보류해둬야 해."**

해석 (컨트롤타워):
- 5 도메인은 **현재** 별도 레포·독립 운영(§1 "본체 흡수 아님")이지만, **미래에 일부/전체가 한 인프라로 병합될 가능성**이 살아 있다.
- 따라서 지금 5 개 독립 ECS cluster + 5 개 독립 RDS 를 셋업하면, 병합 시 (i) cluster/서비스 재배치, (ii) RDS 스키마 통합 또는 분리, (iii) 도메인 URL/시크릿/CI 파이프라인 재작성 — **재마이그레이션 비용이 두 번** 든다.
- 이 보류는 §1 의 "구조 모방, 본체 흡수 아님" 원칙과 **모순되지 않는다**: 코드/디렉토리/CI 구조는 지금 정본과 동형으로 맞추되(이식성 확보), **물리 인프라 토폴로지만** 병합 결정까지 미룬다. 구조가 동형이면 어느 병합 토폴로지로 가든 인프라 적용이 싸진다.
- 임시방편 Vercel 은 이 보류 기간 동안의 FE 미리보기/데모 용도로만 사용. BE 서버 상주가 필요한 단계(Phase ε mutation 이후)는 병합 결정 전까지 로컬 docker 로 검증.

### 16.4 코덱스 review 통과 정책 (확인)

사용자 직접 명시 (2026-05-27): **"코덱스 리뷰는 받아야지"** — close / 강제 머지 / 보류 모두 거부. **PR 머지는 코덱스 APPROVE 후에만**. 룰: `~/.claude/projects/-Users-curea/memory/feedback_codex_review_required.md` 와 일치.

→ 진행 중 3 alignment PR (#101, #82, #108) 처리는 별 사안 — 코덱스가 매 round 새 지적 발견 패턴이라 *어떤 정상 흐름이 가능한지* 사용자 명확화 필요 (close X · 강제 X · 보류 X 모두 잘못된 선택지로 인식).
