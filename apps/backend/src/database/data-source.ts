import "dotenv/config";
import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

import { DEFAULT_DATABASE_PORT } from "../common/constants/server.constant";

/**
 * TypeORM CLI 전용 DataSource 설정.
 * migration:generate, migration:run, migration:revert 명령에서 사용한다.
 * CLI는 빌드된 dist/ 기반으로 실행하므로 경로는 dist 기준이다.
 *
 * NOTE: path alias(`#config/*`)는 CLI 환경에서 해석되지 않으므로 본 파일은 상대 경로만 사용.
 */
export default new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST ?? "localhost",
  port: parseInt(
    process.env.DATABASE_PORT ?? String(DEFAULT_DATABASE_PORT),
    10,
  ),
  username: process.env.DATABASE_USERNAME ?? "pullim",
  password: process.env.DATABASE_PASSWORD ?? "pullim_local",
  database: process.env.DATABASE_NAME ?? "pullim_planner",
  ssl:
    process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  entities: ["dist/entities/**/*.entity.js"],
  migrations: ["dist/database/migrations/**/*.js"],
  namingStrategy: new SnakeNamingStrategy(),
});
