/**
 * Drizzle DB client — Next.js API route 안에서 import해서 사용.
 *
 * Lazy init: 모듈 평가 시점에는 Pool도 drizzle 클라이언트도 만들지 않음.
 * 첫 query(`db.query.X` 등) 호출 시점에 DATABASE_URL 검증·Pool 생성.
 * 이래야 `next build`의 page data collection이 모듈만 import 하는 동안
 * DB 접속이나 PG* 환경변수 fallback이 발생하지 않음.
 *
 * 사용 예:
 *   import { db } from '@/lib/db';
 *   import { planners } from '@/lib/db/schema';
 *   const rows = await db.select().from(planners).where(eq(planners.userId, userId));
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

// 단일 풀 — Next.js hot reload에서 중복 생성 방지 (Node runtime 기준)
declare global {
  var __pullim_pg_pool: Pool | undefined;
}

let _client: DrizzleClient | null = null;

function getClient(): DrizzleClient {
  if (_client) return _client;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local and start `docker compose up -d`.',
    );
  }
  const pool =
    globalThis.__pullim_pg_pool ??
    new Pool({ connectionString, max: 10 });
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__pullim_pg_pool = pool;
  }
  _client = drizzle(pool, { schema });
  return _client;
}

// Proxy를 통해 lazy access — 어떤 속성·메서드든 첫 접근에 클라이언트 초기화.
export const db = new Proxy({} as DrizzleClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});

export { schema };
