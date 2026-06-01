// `.env` 를 모듈 데코레이터 평가(아래 DATABASE_ENABLED 조건부 import) 전에 로드한다.
// ConfigModule.forRoot() 는 본 모듈 import 이후에 실행되므로, .env 의 DATABASE_ENABLED
// 가 조건부 import 시점에 반영되려면 여기서 먼저 dotenv 를 적용해야 한다 (codex R11).
//
// 경로를 **백엔드 앱 기준으로 명시**한다. 루트 AGENTS.md 는 명령을 저장소 루트에서
// 실행하도록 고정하므로(`bun --filter`), dotenv 기본 경로(`cwd/.env`)로는 루트 .env 만
// 탐색해 `apps/backend/.env` 를 놓친다. `__dirname`(컴파일 후 dist, 테스트 시 src) 기준
// 한 단계 위가 백엔드 앱 루트이며 거기에 .env 가 있다 (codex R13 지적).
import { config as loadEnv } from "dotenv";
import { join } from "node:path";
loadEnv({ path: join(__dirname, "..", ".env") });

import { ClassSerializerInterceptor, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ClsModule } from "nestjs-cls";

import { AppConfigModule } from "./common/bootstrap/config.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { QueryFailedExceptionFilter } from "./common/filters/query-failed-exception.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { MockAuthGuard } from "./common/guards/mock-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";

import { AppController } from "./app.controller";

/**
 * 인증 활성 여부. `DATABASE_ENABLED=true` 일 때만 auth 가 동작한다 (실DB 필요).
 *
 * - 활성(true): `AuthModule` import + 전역 `JwtAuthGuard`(Passport jwt). `@Public()` 면제.
 * - 비활성(false, Phase β 스모크): `MockAuthGuard` 유지 — DB·Passport 전략 없이도 부팅되며
 *   기존 스모크 라우트(/api/whoami 등)와 wiring e2e 가 그대로 통과한다.
 *
 * 두 가드는 동일하게 `@Public()`/`@CurrentUser()` 시그니처를 만족하므로 라우트 코드는 무변경.
 */
const AUTH_ENABLED = process.env.DATABASE_ENABLED === "true";

/**
 * pullim-planner 백엔드 루트 모듈.
 *
 * pullim 본체 AppModule 패턴 차용 (planner 단일 도메인용으로 축소):
 * - ClsModule 글로벌 (요청 ID 추적)
 * - AppConfigModule 글로벌 (Joi 검증)
 * - DatabaseModule + AuthModule (TypeORM/JWT) — `DATABASE_ENABLED=true` 일 때만 import
 * - 전역 필터: HttpExceptionFilter → QueryFailedExceptionFilter → AllExceptionsFilter (등록 역순 실행)
 * - 전역 가드: (auth 활성) JwtAuthGuard → RolesGuard / (스모크) MockAuthGuard → RolesGuard
 * - 전역 인터셉터: ClassSerializerInterceptor → ResponseInterceptor (envelope 옵션 A)
 *
 * `DATABASE_ENABLED=true` 일 때 `DatabaseModule`·`AuthModule` 이 import 되고 전역 가드가
 * `JwtAuthGuard`(Passport jwt) 로 전환된다. false(Phase β 스모크)면 DB·Passport 전략 없이
 * 부팅하며 `MockAuthGuard` 가 유지돼 기존 스모크 라우트/wiring e2e 가 그대로 통과한다
 * (codex R10 게이트 패턴 계승).
 */
@Module({
  controllers: [AppController],
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true, generateId: true },
    }),
    AppConfigModule,
    ...(AUTH_ENABLED ? [DatabaseModule, AuthModule] : []),
  ],
  providers: [
    // 실행 순서는 등록 역순: HttpException → QueryFailed → All
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: QueryFailedExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    {
      provide: APP_GUARD,
      useClass: AUTH_ENABLED ? JwtAuthGuard : MockAuthGuard,
    },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
