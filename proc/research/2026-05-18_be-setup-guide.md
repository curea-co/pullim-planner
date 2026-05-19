# 풀림 플래너 BE — 로컬 setup 가이드

> 2026-05-18 작성 · Phase 1 (Schema + Docker + spec) 완료 시점

## 0. 아키텍처 — 무엇이 어디서 도는가

**DB만 Docker. BE(Next.js)는 host.** dev workflow 표준 패턴.

```
┌─────────────────── 개발자 머신 (host) ───────────────────┐
│                                                          │
│   Next.js dev server (bun run dev → :3030)               │
│   ├─ SPA / FE pages                                      │
│   ├─ API routes /api/* (Ph3~)                            │
│   └─ drizzle-kit (generate/migrate/studio)               │
│                       │                                  │
│                       │ pg connection                    │
│                       │ DATABASE_URL=...localhost:5432   │
│                       ▼                                  │
│   Docker Engine                                          │
│   └─ pullim-postgres (Postgres 16-alpine)                │
│      ports 5432:5432, vol ./.docker/postgres             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

| 구성요소 | 위치 | 역할 |
|---|---|---|
| Postgres 16 | Docker 컨테이너 | 데이터 저장. 외부 노출 5432 |
| Next.js (FE + API) | host (`bun run dev`) | FE 페이지 + `/api/*` route handler. hot reload |
| `drizzle-kit` | host | host에서 실행, DATABASE_URL로 컨테이너 DB 접속 |
| `bun run db:*` 스크립트 | host | host에서 `docker compose` CLI를 호출하는 wrapper |

**왜 이 구조인가**
- DB만 컨테이너 → 버전 고정·데이터 격리·팀 환경 동기화. 컨테이너 재시작이 코드에 영향 0.
- BE는 host → bun hot reload 즉시(ms 단위), IDE 디버거 그대로.
- `bun run db:*`는 단지 `docker compose` 또는 `drizzle-kit` 호출 wrapper. docker CLI를 매번 외울 필요 없게 표준화.

**BE도 Docker로 돌리지 않는 이유** — dev에서는 host bun이 빠르고, prod에서는 Vercel(또는 별 컨테이너 platform)이 빌드·배포 책임. dev에 Docker 추가 layer는 hot reload·디버거 복잡도만 늘림.

## 0.1 필요 도구

- Bun ≥ 1.3 (현 repo standard)
- Docker Desktop (또는 OrbStack / colima)

## 1. 환경 변수

```bash
cp .env.example .env.local
```

[`.env.example`](../../.env.example)이 그대로 로컬용 default. prod 배포 시 별 `DATABASE_URL` 주입.

## 2. Docker DB 기동

```bash
bun run db:up           # docker compose up -d
```

Postgres 16-alpine, `localhost:5432`, DB명 `pullim_planner`, user `pullim`. 데이터 볼륨은 `./.docker/postgres/` (gitignored).

검증:
```bash
docker compose ps       # postgres "healthy" 상태 확인
psql postgres://pullim:pullim_local@localhost:5432/pullim_planner -c '\l'
```

## 3. 스키마 → DB 적용

이미 [`drizzle/0000_woozy_forgotten_one.sql`](../../drizzle/0000_woozy_forgotten_one.sql) 초기 마이그레이션이 커밋되어 있다.

```bash
bun run db:migrate      # drizzle-kit migrate — 위 SQL 실행
```

또는 개발 중에 schema.ts만 고치고 빠르게 반영하려면:
```bash
bun run db:push         # drizzle-kit push — 생성 SQL 생략, 직접 DB sync (dev only)
```

## 4. 변경 워크플로우

스키마를 바꿀 때:

1. [`src/lib/db/schema.ts`](../../src/lib/db/schema.ts) 수정
2. `bun run db:generate` — `drizzle/000N_*.sql` 자동 생성
3. SQL diff 검토 (review-friendly)
4. `bun run db:migrate` — 로컬 DB 적용
5. commit (schema.ts + drizzle/000N_*.sql + drizzle/meta/)

## 5. DB GUI

```bash
bun run db:studio       # localhost:4983 — 테이블·row 시각 확인
```

또는 외부 클라이언트(TablePlus, DBeaver, psql)로 직접 접속:
```
host: localhost
port: 5432
db:   pullim_planner
user: pullim
pass: pullim_local
```

## 6. 초기화

데이터를 완전히 날리고 다시 시작:
```bash
bun run db:reset        # docker compose down -v && up -d
bun run db:migrate      # schema 다시 적용
```

## 7. Next.js에서 사용

```ts
// app/api/planners/route.ts (Ph3에서 구현 예정)
import { db } from '@/lib/db';
import { planners } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  const userId = req.headers.get('x-user-id') ?? 'student_001';
  const rows = await db.select().from(planners).where(eq(planners.userId, userId));
  return Response.json({ data: rows });
}
```

DB client는 [`src/lib/db/index.ts`](../../src/lib/db/index.ts)에서 single Pool로 관리. Next.js hot reload에서 connection 누수 방지를 위해 `globalThis` cache.

## 8. 다음 단계 (Ph3~)

[`proc/spec/2026-05-18_be-api-design.md`](../spec/2026-05-18_be-api-design.md) §5 로드맵 참조. Ph1·Ph2 완료. 다음 차례:

- ✅ **Ph2 seed** — mock data → DB ([`scripts/seed.ts`](../../scripts/seed.ts), `bun run db:seed`로 실행)
- **Ph3 read endpoint** — `/api/me`, `/api/planners`, `/api/planners/{id}/blocks?date=...`
- **Ph4 mutation** — Planner CRUD + activate/archive

### Ph2 seed 사용법

```bash
bun run db:up        # 컨테이너 떠 있는지 확인
bun run db:migrate   # 처음 한 번 (이미 했으면 skip)
bun run db:seed      # mock → DB (idempotent: 매 실행마다 TRUNCATE 후 재삽입)
```

seed 내용 — users 1건(서연, student_001), planners 3건(6월 모의평가 active / 1학기 기말 / 4월 학평 archived), planner_subject_units, curriculum_nodes 6 과목 × 3 depth, pedagogy_engines 7건, today blocks 8건 + block_completions(done 2건), daily_conditions + burnout_snapshots(2026-04-24 기준).

## 9. 트러블슈팅

| 증상 | 원인·조치 |
|---|---|
| `connection refused 5432` | `docker compose ps`로 postgres healthy 확인. 안 떠 있으면 `bun run db:up` |
| `DATABASE_URL is not set` | `.env.local` 누락. `cp .env.example .env.local` |
| migration이 conflict | `bun run db:reset` (개발용, 데이터 삭제 주의) |
| Drizzle Studio 안 열림 | port 4983 점유 확인 — `lsof -i :4983` |
| Next.js에서 connection pool 누수 | `src/lib/db/index.ts` globalThis cache가 hot reload 대응. 그래도 누수면 dev server 재시작 |

## 10. 정합 진행 상태

- [x] Phase 1 — Schema + Docker + spec
- [x] Phase 2 — seed (mock → DB)
- [ ] Phase 3 — read endpoint
- [ ] Phase 4 — mutation endpoint
- [ ] Phase 5 — block lifecycle
- [ ] Phase 6 — report 집계
- [ ] Phase 7 — FE mock 함수 → API 교체
- [ ] Phase 8 — 인증
- [ ] Phase 9 — prod DB
