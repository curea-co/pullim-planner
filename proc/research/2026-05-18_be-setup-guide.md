# 풀림 플래너 BE — 로컬 setup 가이드

> 2026-05-18 작성 · Phase 1 (Schema + Docker + spec) 완료 시점

## 0. 필요 도구

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

## 8. 다음 단계 (Ph2~)

[`proc/spec/2026-05-18_be-api-design.md`](../spec/2026-05-18_be-api-design.md) §5 로드맵 참조. 이번 Ph1은 Schema + Docker + spec까지. 다음 차례:

- **Ph2 seed** — mock data를 DB로 insert (`scripts/seed.ts`)
- **Ph3 read endpoint** — `/api/me`, `/api/planners`, `/api/planners/{id}/blocks?date=...`
- **Ph4 mutation** — Planner CRUD + activate/archive

## 9. 트러블슈팅

| 증상 | 원인·조치 |
|---|---|
| `connection refused 5432` | `docker compose ps`로 postgres healthy 확인. 안 떠 있으면 `bun run db:up` |
| `DATABASE_URL is not set` | `.env.local` 누락. `cp .env.example .env.local` |
| migration이 conflict | `bun run db:reset` (개발용, 데이터 삭제 주의) |
| Drizzle Studio 안 열림 | port 4983 점유 확인 — `lsof -i :4983` |
| Next.js에서 connection pool 누수 | `src/lib/db/index.ts` globalThis cache가 hot reload 대응. 그래도 누수면 dev server 재시작 |

## 10. 정합 진행 상태

- [x] Phase 1 — Schema + Docker + spec (이번)
- [ ] Phase 2 — seed (mock → DB)
- [ ] Phase 3 — read endpoint
- [ ] Phase 4 — mutation endpoint
- [ ] Phase 5 — block lifecycle
- [ ] Phase 6 — report 집계
- [ ] Phase 7 — FE mock 함수 → API 교체
- [ ] Phase 8 — 인증
- [ ] Phase 9 — prod DB
