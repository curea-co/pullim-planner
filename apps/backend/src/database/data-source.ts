import "dotenv/config";
import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { DEFAULT_DATABASE_PORT } from "../common/constants/server.constant";
import { parsePort } from "../common/utils/env.util";

/**
 * `DATABASE_URL` 우선 파싱 — 누락 필드는 discrete env vars 로 보충.
 * `apps/backend/src/config/database.config.ts` 와 동일한 우선순위 규칙을 따른다.
 * (TypeORM CLI 는 NestJS ConfigService 를 거치지 않으므로 동일 로직을 별도 보유)
 */
function resolveDbConfig() {
  let fromUrl: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    name?: string;
    ssl?: boolean;
  } | null = null;

  if (process.env.DATABASE_URL) {
    let parsed: URL;
    try {
      parsed = new URL(process.env.DATABASE_URL);
    } catch (err) {
      // 앱 런타임(database.config.ts)과 동일하게 fail-fast.
      // CLI 만 다른 DB 로 migration 이 돌아가는 drift 를 막는다 (codex R6 지적).
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to parse DATABASE_URL: ${reason}. ` +
          `Set DATABASE_URL to a valid postgres URL ` +
          `(e.g. postgres://user:pass@host:5432/dbname) or unset it and ` +
          `use DATABASE_HOST/PORT/USERNAME/PASSWORD/NAME env vars instead.`,
      );
    }
    fromUrl = {
      host: parsed.hostname || undefined,
      port: parsed.port ? parseInt(parsed.port, 10) : undefined,
      username: parsed.username
        ? decodeURIComponent(parsed.username)
        : undefined,
      password: parsed.password
        ? decodeURIComponent(parsed.password)
        : undefined,
      name: parsed.pathname?.replace(/^\//, "") || undefined,
      ssl: parsed.searchParams.get("sslmode") === "require",
    };
  }

  return {
    host: fromUrl?.host ?? process.env.DATABASE_HOST ?? "localhost",
    // `DATABASE_PORT` 도 `DATABASE_URL` 과 동일하게 fail-fast 검증한다.
    // `NaN` 이 그대로 통과해 migration CLI 가 TypeORM 내부에서 불명확하게
    // 터지는 것을 막는다 (codex R8 지적).
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
    database: fromUrl?.name ?? process.env.DATABASE_NAME ?? "pullim_planner",
    ssl:
      (fromUrl?.ssl ?? process.env.DATABASE_SSL === "true")
        ? { rejectUnauthorized: false }
        : false,
  };
}

const dbConfig = resolveDbConfig();

/**
 * TypeORM CLI 전용 DataSource 설정.
 * migration:generate, migration:run, migration:revert 명령에서 사용한다.
 * CLI는 빌드된 dist/ 기반으로 실행하므로 경로는 dist 기준이다.
 *
 * NOTE: path alias(`#config/*`)는 CLI 환경에서 해석되지 않으므로 본 파일은 상대 경로만 사용.
 */
export default new DataSource({
  type: "postgres",
  ...dbConfig,
  entities: ["dist/entities/**/*.entity.js"],
  migrations: ["dist/database/migrations/**/*.js"],
  namingStrategy: new SnakeNamingStrategy(),
});
