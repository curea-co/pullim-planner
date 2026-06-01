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
 * Phase β planner BE 차용 시점에서는 DB·App 설정만 다룬다.
 * pullim 본체의 JWT/Redis/KCB/AWS/Toss 설정은 도메인 미도입으로 제외.
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
