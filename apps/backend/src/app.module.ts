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
 * - DatabaseModule (TypeORM)
 * - 전역 필터: HttpExceptionFilter → QueryFailedExceptionFilter → AllExceptionsFilter (등록 역순 실행)
 * - 전역 가드: MockAuthGuard → RolesGuard
 * - 전역 인터셉터: ClassSerializerInterceptor → ResponseInterceptor (envelope 옵션 A)
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
    DatabaseModule,
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
