@AGENTS.md

# 풀림 플래너 작업 가이드 (모노레포)

이 리포는 [curea-co/pullim](https://github.com/curea-co/pullim) 의 BE 구조를 차용한 **bun workspace 모노레포**입니다. `pullim-planner`는 향후 `pullim` 플랫폼의 하위 도메인으로 흡수될 SaaS 단위로, 본 리포는 그 흡수 전 단계의 단독 운영체입니다.

마이그레이션 plan(권위): [proc/plan/2026-05-26_pullim-be-adoption.md](proc/plan/2026-05-26_pullim-be-adoption.md)

## 1. 모노레포 구조

```
pullim-planner/
├── apps/
│   ├── planner/        # Next.js 16 (App Router) — 학생용 학습 플래너 FE
│   └── backend/        # NestJS 11 — Planner 도메인 BE (Phase β 이후 본격)
├── packages/
│   ├── types/          # BE↔FE 공유 타입 (현재 빈 placeholder)
│   ├── api-client/     # FE → BE fetch 래퍼 (현재 빈 placeholder)
│   └── auth/           # IAuthProvider 추상화 + MockAuthProvider (현재 빈 placeholder)
├── proc/               # plan / spec / knowhow / archive / research
├── input/              # 기획 문서 (docs-archive 권위)
├── daily_outcome/      # PM 일일 보고
├── docker-compose.yml  # 로컬 Postgres 16
├── turbo.json
├── tsconfig.base.json
├── package.json        # workspace root
└── bun.lock
```

## 2. 작업 영역별 boundary

### apps/planner — Planner FE
- **편집 영역**: 페이지, 컴포넌트, mock, lib, public 등 자유
- **도메인 컴포넌트** — `apps/planner/src/components/features/<domain>/{containers,presenters,components,hooks}/` 컨벤션 ([AGENTS.md](AGENTS.md) Container/Presenter 표 참조)
  - 진행 중인 재편: [proc/plan/2026-05-26_container-presenter-adoption.md](proc/plan/2026-05-26_container-presenter-adoption.md)
  - `features/`로 이동된 도메인:
    - `planner-reports` (Phase 1 — Container/Presenter 분리 완료)
    - `planner-manage` (Phase 2 — list/new/edit 3 페이지 분리 + `usePlannerForm` hook + `PlannerWizard` 컴포넌트)
    - `planner-home` (Phase 3 — `HomeContainer`/`HomePresenter` + `planner/*` 28개 컴포넌트 전체 흡수)
    - `planner-onboarding` (Phase 3 — `OnboardingContainer`/`OnboardingPresenter`, widget은 planner-home에서 빌려옴)
  - 미이동 (잔여): `src/components/{planner-builder,builder}/` — Phase 4에서 이동 예정
  - **cross-feature import** — feature 간 컴포넌트 직접 import 허용 (예: `planner-reports` Presenter가 `planner-home`의 `today-reflection` 사용, `planner-onboarding`이 `planner-home`의 widget들 사용). 단 widget 소유권은 명확히
- **공유 컴포넌트** (`apps/planner/src/components/shared/*`) — **진짜 순수 프리젠테이션**만 (state·router·side effect·mock selector 일체 없음). 도메인 로직이 한 줄이라도 있으면 해당 feature(`features/<domain>/`) 소유로 분류. 현재 거주자: `d-day-chip.tsx` (D-day 표시, props만). pullim `apps/web/components/shared/` 패턴 차용
- **셸**(`apps/planner/src/components/shell/*`), **UI 프리미티브**(`apps/planner/src/components/ui/*`), **brand**(`apps/planner/src/components/brand/*`), **tokens**(`apps/planner/src/lib/tokens/*`)는 플래너 단일 도메인이라 자유롭게 수정 가능 (글로벌 셸/프리미티브로 유지)
- mock 메타 구조(`apps/planner/src/lib/mock/planner.ts` 등) 변경은 BE entity와 정합 깨질 수 있으니 신중

### apps/backend — Planner BE (NestJS)
- **편집 영역**: `apps/backend/src/modules/planner/` 등 planner 도메인 모듈, entities — Phase β 이후부터
- pullim 패턴 그대로 차용: controller / use-cases / service / interface / infrastructure
- **BE 전역 인프라**(`apps/backend/src/{common,config,database}/`)는 §4 글로벌 작업으로 분리 — Phase β에서 pullim common 패턴 차용 시 신중 수정 (bootstrap·filters·guards·interceptors 등은 `common/` 하위)
- 다른 도메인(user/auth/workbook 등) 추가는 **사용자 명시 확인 필요** (현 차용 결정 = planner 단일 도메인)

### packages/* — 공유 패키지
- 편집 시 apps/planner와 apps/backend 양쪽에 영향 → 신중
- 현재는 빈 placeholder, Phase β·δ에서 본격 구현

### 공통 문서 (read only)
- `input/docs-archive/00_풀림_기능기획_Skill.md` — 기획 작성 가이드
- `input/docs-archive/04_풀림_종합_마스터.md` — 풀림 전체 IA 컨텍스트
- `input/docs-archive/06_풀림_시간표_세부기획.md` — 시간표 세부 기획
- `input/docs-archive/08_풀림_플래너_핸드오프.md` — **플래너 도메인 권위** (이 리포의 source of truth)
- `proc/spec/2026-05-18_be-api-design.md` — BE API 설계 spec (Phase α 머지 후 갱신됨)

## 3. 명령어

| 작업 | 명령 |
|---|---|
| 의존성 설치 | `bun install` |
| Planner FE dev (port 3030) | `bun run dev:planner` |
| Backend dev (port 4030) | `bun run dev:backend` |
| 둘 다 dev (turbo 병렬) | `bun run dev` |
| Planner build (standalone) | `bun run build:planner` |
| Backend build | `bun run build:backend` |
| 전체 build | `bun run build` |
| 전체 typecheck | `bun run typecheck` |
| 전체 lint | `bun run lint` |
| Postgres 컨테이너 | `bun run db:up` / `db:down` / `db:reset` |

특정 워크스페이스에만 명령 실행:
```
bun --filter @pullim-planner/planner <script>
bun --filter @pullim-planner/backend <script>
```

## 4. 락인 컨벤션

이 리포는 *영구 플래너 락인*이라 별도 도메인 선언 없이도 planner boundary가 기본값입니다.

### 해도 되는 것 (편집)
- `apps/planner/` 내 페이지·컴포넌트·mock·lib 수정·신규
- `apps/backend/src/modules/planner/` 내 BE 작업 (Phase β 이후)
- 마이그레이션 plan(`proc/plan/2026-05-26_pullim-be-adoption.md`) 의 Phase 진행

### 사용자 명시 확인 필요 (글로벌 작업)
- root 파일(`package.json`, `turbo.json`, `tsconfig.base.json`, `docker-compose.yml`) 편집
- `.github/workflows/**` 편집 (CI/Codex Review 등 저장소 전체 자동화 동작 변경)
- `packages/*` 내부 인터페이스 변경 (apps 양쪽 영향)
- `apps/backend/src/{common,config,database}/*` 편집 (BE 전역 영향. bootstrap·filters·guards·interceptors 등은 `common/` 하위)
- 새 도메인 모듈 추가 (user, auth, workbook 등 — pullim에서 추가 차용)
- 이 가이드 / AGENTS.md / README.md 편집

## 5. Orchestration 체크리스트 (작업 마치기 전)

1. **`apps/planner/src/components/shell/nav-config.ts`** — `plannerSection` 안 href가 실제 라우트와 일치하는지
2. **`input/docs-archive/08_풀림_플래너_핸드오프.md`** — 권위 문서의 IA·용어와 코드가 어긋나지 않는지
3. **`apps/planner/src/lib/mock/planner.ts`** — 시간표·블록·컨디션·번아웃 등 시그니처 데이터 구조 일관성
4. **`apps/backend/src/entities/`** (Phase γ 이후) — entity 시그니처와 mock·spec 정합
5. **Codex Review 통과** — PR 머지 전 필수

## 6. 컨벤션 변경

이 가이드 자체를 수정해야 할 때는 **글로벌 작업**으로 분리. 일반 작업 중에 이 파일을 수정하지 말 것.
