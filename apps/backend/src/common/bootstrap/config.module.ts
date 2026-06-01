import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "joi";

import {
  DEFAULT_ENVIRONMENT,
  ENVIRONMENTS,
} from "../constants/environment.constant";
import { DEFAULT_PORT } from "../constants/server.constant";
import appConfig from "../../config/app.config";
import databaseConfig from "../../config/database.config";

/**
 * 글로벌 ConfigModule.
 *
 * DB·App 설정 + Phase 0 auth(JWT/pepper) 설정을 검증한다.
 * auth 는 `DATABASE_ENABLED=true` 일 때만 동작하므로 JWT_SECRET/PASSWORD_PEPPER 는
 * 그때만 조건부 필수다 (`when`). pullim 본체의 Redis/KCB/AWS/Toss 설정은 미도입으로 제외.
 *
 * NOTE: `jwtConfig`(config/jwt.config) 는 `JWT_SECRET` 미설정 시 throw 하므로, auth 비활성
 * (스모크) 환경에서 즉시 평가되지 않도록 여기 `load` 에 넣지 않고 `AuthModule` 에서만
 * forFeature 로 등록한다. 본 모듈은 검증 스키마만 추가한다.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid(...ENVIRONMENTS)
          .default(DEFAULT_ENVIRONMENT),
        PORT: Joi.number().default(DEFAULT_PORT),
        // App
        FRONTEND_URL: Joi.string().default("http://localhost:3030"),
        CORS_ORIGIN: Joi.string().default("http://localhost:3030"),
        TRUST_PROXY_HOPS: Joi.number().integer().min(0).default(0),
        // Auth / JWT (Phase 0). DATABASE_ENABLED=true(=auth 활성)일 때만 필수.
        JWT_SECRET: Joi.string().when("DATABASE_ENABLED", {
          is: "true",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        PASSWORD_PEPPER: Joi.string().when("DATABASE_ENABLED", {
          is: "true",
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        JWT_EXPIRATION: Joi.number().optional(),
        JWT_REFRESH_EXPIRATION: Joi.number().optional(),
        // Database
        // Phase β: 루트 모듈이 DB 연결을 강제하지 않도록 gate. common 인프라 스모크
        // 라우트(/api/health, /api/whoami, /_test-throw)는 Postgres 없이도 부팅돼야 한다
        // (codex R10 지적). Phase γ entity 도입 시 `true` 로 전환. 기본 false.
        DATABASE_ENABLED: Joi.string().valid("true", "false").default("false"),
        DATABASE_HOST: Joi.string().default("localhost"),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_USERNAME: Joi.string().default("pullim"),
        DATABASE_PASSWORD: Joi.string().default("pullim_local"),
        DATABASE_NAME: Joi.string().default("pullim_planner"),
        DATABASE_SSL: Joi.string().valid("true", "false").default("false"),
        DATABASE_SYNCHRONIZE: Joi.string()
          .valid("true", "false")
          .default("true"),
      }),
    }),
  ],
})
export class AppConfigModule {}
