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
import { MockAuthGuard } from "./common/guards/mock-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { DatabaseModule } from "./database/database.module";

import { AppController } from "./app.controller";

/**
 * pullim-planner 백엔드 루트 모듈.
 *
 * pullim 본체 AppModule 패턴 차용 (planner 단일 도메인용으로 축소):
 * - ClsModule 글로벌 (요청 ID 추적)
 * - AppConfigModule 글로벌 (Joi 검증)
 * - DatabaseModule (TypeORM) — `DATABASE_ENABLED=true` 일 때만 import
 * - 전역 필터: HttpExceptionFilter → QueryFailedExceptionFilter → AllExceptionsFilter (등록 역순 실행)
 * - 전역 가드: MockAuthGuard → RolesGuard
 * - 전역 인터셉터: ClassSerializerInterceptor → ResponseInterceptor (envelope 옵션 A)
 *
 * Phase β: common 인프라 스모크 라우트(/api/health, /api/whoami, /_test-throw)는 DB 가
 * 없어도 부팅·검증돼야 하므로 `DatabaseModule` 을 `DATABASE_ENABLED` env 로 게이트한다
 * (codex R10 지적). Phase γ entity 도입 시 `DATABASE_ENABLED=true` 로 전환.
 *
 * planner 도메인 모듈은 Phase γ에서 추가.
 */
@Module({
  controllers: [AppController],
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true, generateId: true },
    }),
    AppConfigModule,
    ...(process.env.DATABASE_ENABLED === "true" ? [DatabaseModule] : []),
  ],
  providers: [
    // 실행 순서는 등록 역순: HttpException → QueryFailed → All
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: QueryFailedExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: MockAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
