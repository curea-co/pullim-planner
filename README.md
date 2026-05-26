# 풀림 플래너 — bun workspace 모노레포

학생용 학습 플래너. 향후 `pullim` 플랫폼의 하위 도메인으로 흡수될 SaaS 단위로, 본 리포는 흡수 전 단계의 단독 운영체입니다.

BE 구조는 [curea-co/pullim](https://github.com/curea-co/pullim) 패턴 차용 (NestJS 11 + TypeORM, clean architecture + Facade). 마이그레이션은 [proc/plan/2026-05-26_pullim-be-adoption.md](proc/plan/2026-05-26_pullim-be-adoption.md) Phase α~η로 단계적 진행.

## 구조

```
pullim-planner/
├── apps/
│   ├── planner/        # Next.js 16 (App Router) — Planner FE
│   └── backend/        # NestJS 11 — Planner BE (Phase β 이후 본격)
├── packages/
│   ├── types/          # BE↔FE 공유 타입 (Phase γ에서 본격)
│   ├── api-client/     # FE → BE fetch 래퍼 (Phase δ에서 본격)
│   └── auth/           # IAuthProvider 추상화 (Phase β에서 본격)
├── proc/               # plan / spec / knowhow / archive / research
├── input/              # 기획 문서 (docs-archive 권위)
├── daily_outcome/      # PM 일일 보고
├── docker-compose.yml  # 로컬 Postgres 16
├── turbo.json          # turbo 2.x
├── tsconfig.base.json  # 공유 compiler options
└── package.json        # workspace root
```

## 실행

### 처음 한 번 (setup)

```bash
bun install
cp apps/planner/.env.example apps/planner/.env.local
cp apps/backend/.env.example apps/backend/.env       # 선택 (Phase γ에서 활용)
bun run db:up                                         # Phase γ 진입 후 실제 사용
```

### 매일 개발할 때

```bash
bun run dev               # planner(3030) + backend(4030) 동시 (turbo 병렬)
bun run dev:planner       # planner만
bun run dev:backend       # backend만
```

| 명령 | 설명 |
|---|---|
| `bun run dev` | planner + backend 병렬 |
| `bun run dev:planner` | Next.js dev (port 3030) |
| `bun run dev:backend` | NestJS dev with watch (port 4030) |
| `bun run build` | 전체 build (turbo) |
| `bun run typecheck` | 전체 typecheck |
| `bun run lint` | 전체 lint |
| `bun run db:up` / `db:down` / `db:reset` | Postgres 컨테이너 |
| `bun --filter @pullim-planner/<pkg> <script>` | 특정 워크스페이스만 |

### 필요 도구

- **Bun ≥ 1.3** — 패키지 매니저·런타임
- **Docker Desktop** (또는 OrbStack / colima) — Phase γ 이후 Postgres 컨테이너용
- **Node ≥ 20** — nest-cli 호환용 (시스템에 설치되어 있으면 충분)

## 기술 스택

| 레이어 | 기술 |
|---|---|
| FE 프레임워크 | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript |
| FE 스타일 | TailwindCSS 4 + shadcn/ui (base-nova) |
| FE 차트·알림·아이콘 | recharts / sonner / lucide-react |
| BE 프레임워크 | NestJS 11 (clean architecture + Facade) |
| BE ORM | TypeORM 0.3.x — Phase γ 진입 후 |
| DB | PostgreSQL 16 (Docker) |
| 모노레포 | bun workspaces + turbo 2.x |

## Phase 진행 상황

| Phase | 내용 | 상태 |
|---|---|---|
| α | 모노레포 재편 + Drizzle 폐기 + NestJS Hello World | 진행 중 |
| β | pullim common 패턴 차용 (filters/interceptors/guards) | 대기 |
| γ | planner entity + 마이그레이션 + seed | 대기 |
| δ | read endpoint 3건 이식 | 대기 |
| ε | mutation endpoint 6건 이식 | 대기 |
| ζ | planner mock 잔여 시그니처 이식 | 대기 |
| η | FE mock 제거 → @pullim-planner/api-client 전환 | 대기 |

상세는 [proc/plan/2026-05-26_pullim-be-adoption.md](proc/plan/2026-05-26_pullim-be-adoption.md).
