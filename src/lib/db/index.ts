/**
 * Drizzle DB client — Next.js API route 안에서 import해서 사용.
 *
 * 사용 예 (Ph3 endpoint 구현 시):
 *   import { db } from '@/lib/db';
 *   import { planners } from '@/lib/db/schema';
 *   const rows = await db.select().from(planners).where(eq(planners.userId, userId));
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env.local and start `docker compose up -d`.',
  );
}

// 단일 풀 — Next.js hot reload에서 중복 생성 방지 (Node runtime 기준)
declare global {
  // eslint-disable-next-line no-var
  var __pullim_pg_pool: Pool | undefined;
}

const pool =
  globalThis.__pullim_pg_pool ??
  new Pool({
    connectionString,
    max: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pullim_pg_pool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
