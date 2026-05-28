import "dotenv/config";
import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { DEFAULT_DATABASE_PORT } from "../common/constants/server.constant";

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
    try {
      const parsed = new URL(process.env.DATABASE_URL);
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
    } catch {
      fromUrl = null;
    }
  }

  return {
    host: fromUrl?.host ?? process.env.DATABASE_HOST ?? "localhost",
    port:
      fromUrl?.port ??
      parseInt(process.env.DATABASE_PORT ?? String(DEFAULT_DATABASE_PORT), 10),
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
