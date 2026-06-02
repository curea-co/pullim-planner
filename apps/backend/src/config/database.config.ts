import { registerAs } from "@nestjs/config";

import { DEFAULT_DATABASE_PORT } from "../common/constants/server.constant";
import { parsePort } from "../common/utils/env.util";

/**
 * `DATABASE_URL` (`postgres://user:pass@host:port/dbname`) 형식 env를 파싱해
 * 개별 DB 설정 필드로 분해한다.
 *
 * - URL 이 설정되어 있지 않으면 `null` 반환 (discrete env vars 로 fallback).
 * - URL 이 설정되어 있지만 파싱 실패 시 **즉시 throw** — 잘못된 DB 로 묵시적으로
 *   부팅·마이그레이션되는 사고를 막는다 (codex R5 지적 반영).
 *
 * spec/.env.example 모두 `DATABASE_URL` 단일 변수를 안내하지만 TypeORM 옵션은 host/port/...
 * 형태를 받으므로 본 헬퍼로 분해한다. URL 이 설정되어 있으면 우선 적용하고, 누락 필드는
 * discrete env vars 로 보충한다.
 */
function parseDatabaseUrl(): {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  name?: string;
  ssl?: boolean;
} | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to parse DATABASE_URL: ${reason}. ` +
        `Set DATABASE_URL to a valid postgres URL ` +
        `(e.g. postgres://user:pass@host:5432/dbname) or unset it and ` +
        `use DATABASE_HOST/PORT/USERNAME/PASSWORD/NAME env vars instead.`,
    );
  }
  return {
    host: parsed.hostname || undefined,
    port: parsed.port ? parseInt(parsed.port, 10) : undefined,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    name: parsed.pathname?.replace(/^\//, "") || undefined,
    ssl: parsed.searchParams.get("sslmode") === "require",
  };
}

/**
 * 데이터베이스 ConfigService 네임스페이스.
 *
 * auth 도입(Phase 0+1)부터 마이그레이션이 스키마의 단일 진실 원천이다. 또한 레거시
 * Drizzle `users` 테이블을 TypeORM 이 자동 변경하면 안 되므로 `synchronize` **기본값은
 * false** 다 (`DATABASE_SYNCHRONIZE=true` 로 명시 opt-in 한 경우에만 동기화). 이렇게 해야
 * fresh DB 부팅 경로에서 migration 전제와 충돌하지 않는다 (codex #40 round-2).
 *
 * 입력 우선순위: `DATABASE_URL` → discrete env vars (`DATABASE_HOST`/`DATABASE_PORT`/...).
 * spec §10 / `.env.example` 가 `DATABASE_URL` 단일 변수를 안내하므로 본 config 도 이를 1순위로 둔다.
 */
export default registerAs("database", () => {
  // Phase β: `DATABASE_ENABLED` 가 켜져 있지 않으면 DatabaseModule 이 import 되지 않으므로
  // (app.module 참조) 본 config 값은 사용되지 않는다. 이때는 env 의 DATABASE_URL/PORT 를
  // 파싱·검증하지 않고 inert 기본값을 돌려준다. 그래야 셸/CI 에 잘못된 DATABASE_URL 이
  // 남아 있어도 DB 비활성 스모크 서버(/api/health 등)가 부팅된다 (codex R11 지적).
  if (process.env.DATABASE_ENABLED !== "true") {
    return {
      host: "localhost",
      port: DEFAULT_DATABASE_PORT,
      username: "pullim",
      password: "pullim_local",
      name: "pullim_planner",
      ssl: false,
      synchronize: process.env.DATABASE_SYNCHRONIZE === "true",
    };
  }

  const fromUrl = parseDatabaseUrl();

  return {
    host: fromUrl?.host ?? process.env.DATABASE_HOST ?? "localhost",
    port:
      fromUrl?.port ??
      parsePort(
        process.env.DATABASE_PORT,
        DEFAULT_DATABASE_PORT,
        "DATABASE_PORT",
      ),
    username: fromUrl?.username ?? process.env.DATABASE_USERNAME ?? "pullim",
    password:
      fromUrl?.password ?? process.env.DATABASE_PASSWORD ?? "pullim_local",
    name: fromUrl?.name ?? process.env.DATABASE_NAME ?? "pullim_planner",
    ssl: fromUrl?.ssl ?? process.env.DATABASE_SSL === "true",
    synchronize: process.env.DATABASE_SYNCHRONIZE === "true",
  };
});
