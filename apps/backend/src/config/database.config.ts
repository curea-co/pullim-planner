import { registerAs } from "@nestjs/config";

import { DEFAULT_DATABASE_PORT } from "../common/constants/server.constant";

/**
 * `DATABASE_URL` (`postgres://user:pass@host:port/dbname`) 형식 env를 파싱해
 * 개별 DB 설정 필드로 분해한다. URL 이 없거나 파싱 실패 시 `null` 반환.
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
  try {
    const parsed = new URL(url);
    return {
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
    return null;
  }
}

/**
 * 데이터베이스 ConfigService 네임스페이스.
 *
 * planner BE 차용 시점에서는 `DATABASE_SYNCHRONIZE=true` 로 운영한다 (pullim 본체 패턴 동일).
 * Phase γ에서 entity 작성 후 마이그레이션 체계 전환은 향후 결정.
 *
 * 입력 우선순위: `DATABASE_URL` → discrete env vars (`DATABASE_HOST`/`DATABASE_PORT`/...).
 * spec §10 / `.env.example` 가 `DATABASE_URL` 단일 변수를 안내하므로 본 config 도 이를 1순위로 둔다.
 */
export default registerAs("database", () => {
  const fromUrl = parseDatabaseUrl();

  return {
    host: fromUrl?.host ?? process.env.DATABASE_HOST ?? "localhost",
    port:
      fromUrl?.port ??
      parseInt(process.env.DATABASE_PORT ?? String(DEFAULT_DATABASE_PORT), 10),
    username: fromUrl?.username ?? process.env.DATABASE_USERNAME ?? "pullim",
    password:
      fromUrl?.password ?? process.env.DATABASE_PASSWORD ?? "pullim_local",
    name: fromUrl?.name ?? process.env.DATABASE_NAME ?? "pullim_planner",
    ssl: fromUrl?.ssl ?? process.env.DATABASE_SSL === "true",
    synchronize: process.env.DATABASE_SYNCHRONIZE !== "false",
  };
});
