import { registerAs } from "@nestjs/config";
import { DEFAULT_DATABASE_PORT } from "../common/constants/server.constant";

/**
 * 데이터베이스 ConfigService 네임스페이스.
 *
 * planner BE 차용 시점에서는 `DATABASE_SYNCHRONIZE=true` 로 운영한다 (pullim 본체 패턴 동일).
 * Phase γ에서 entity 작성 후 마이그레이션 체계 전환은 향후 결정.
 */
export default registerAs("database", () => ({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: parseInt(
    process.env.DATABASE_PORT ?? String(DEFAULT_DATABASE_PORT),
    10,
  ),
  username: process.env.DATABASE_USERNAME ?? "pullim",
  password: process.env.DATABASE_PASSWORD ?? "pullim_local",
  name: process.env.DATABASE_NAME ?? "pullim_planner",
  ssl: process.env.DATABASE_SSL === "true",
  synchronize: process.env.DATABASE_SYNCHRONIZE !== "false",
}));
