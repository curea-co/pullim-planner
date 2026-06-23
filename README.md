# 풀림 플래너

오늘 뭐 공부할지 계획 세우고, 끝나면 결과를 기록하는 학습 플래너예요.<br/>
시간표를 짜면 하루 블록이 쫙 펼쳐지고, 공부 마친 블록을 체크하다 보면 오늘 얼마나 했는지 한눈에 보여요.<br/>
매일 컨디션도 기록하고, 번아웃이 가까워지면 알림도 와요.<br/>
공부한 내역은 친구한테 인증 카드로 공유할 수도 있어요.<br/>

---

**dev 배포:** [dev-planner.pullim.ai](https://dev-planner.pullim.ai/planner) (팀 전용, Vercel 로그인 필요)  
**리포:** bun workspace 모노레포. 풀림 플랫폼의 하위 도메인으로 흡수 예정이며, 현재는 단독 운영체입니다.

## 현재 구현된 화면

| 라우트 | 기능 |
|---|---|
| `/planner` | 홈 — 월간/주간/일간 캘린더, 오늘 블록 현황, 번아웃 배너, 웰컴 모달 |
| `/planner/manage` | 시간표 관리 — 목록/생성/편집/활성화/보관 |
| `/planner/reports` | 리포트 — 주간 인사이트, 컨디션 추이, 부모 공유 |
| `/planner/share` | 공스타그램 — 인증 카드 허브, 친구 피드, 목표 진행 위젯 |
| `/planner/share/setup` | 공스타그램 세팅 — 주제·톤·목표 기간 |
| `/planner/share/friends` | 친구 관리 — 요청·수락·close-friends 지정 |
| `/planner/notifications` | 알림 목록 |
| `/planner/onboarding` | 온보딩 |
| `/planner/builder` | 시간표 빌더 |

인증은 pullim-api 쿠키 SSO (`dev-api.pullim.ai`). 데이터 레이어는 `packages/api-client` + 일부 mock 혼용.

## 구조

```
pullim-planner/
├── apps/
│   ├── planner/        # Next.js 16 (App Router) — Planner FE
│   └── backend/        # NestJS 11 — Planner BE (Phase β 이후 본격)
├── packages/
│   ├── types/          # BE↔FE 공유 타입 (placeholder)
│   ├── api-client/     # FE → pullim-api fetch 래퍼 (구현 완료 — pullim-planner.ts 등)
│   └── auth/           # IAuthProvider 추상화 (placeholder)
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
| α | 모노레포 재편 + Drizzle 폐기 + NestJS Hello World | ✅ 완료 |
| §10 cutover | FE 데이터·인증을 pullim-api 쿠키 SSO로 전환 + `api-client` 구현 | ✅ 완료 (dev 라이브) |
| β | pullim common 패턴 차용 (filters/interceptors/guards) | 대기 |
| γ | planner entity + 마이그레이션 + seed | 대기 |
| δ | read endpoint 3건 이식 | 대기 |
| ε | mutation endpoint 6건 이식 | 대기 |
| ζ | planner mock 잔여 시그니처 이식 | 대기 |
| η | FE mock 제거 → @pullim-planner/api-client 전환 | 대기 |

상세는 [proc/plan/2026-05-26_pullim-be-adoption.md](proc/plan/2026-05-26_pullim-be-adoption.md).
