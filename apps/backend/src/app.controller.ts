import {
  Controller,
  Get,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Environment } from "./common/constants/environment.constant";
import { ErrorMessages } from "./common/constants/error-messages.constant";
import {
  AuthenticatedUser,
  CurrentUser,
} from "./common/decorators/current-user.decorator";
import { Public } from "./common/decorators/public.decorator";
import appConfig from "./config/app.config";

/**
 * 운영 환경에서는 검증용 dev-only 라우트(`/_test-throw`, `/_test-unknown-throw`)를
 * 비활성화한다 — Swagger 와 동일하게 localhost/test/development 에서만 노출.
 */
const DEV_ROUTE_ENABLED_ENVS: string[] = [
  Environment.LOCALHOST,
  Environment.TEST,
  Environment.DEVELOPMENT,
];

/**
 * Phase β 검증용 루트 컨트롤러.
 *
 * Phase γ에서 planner 도메인 컨트롤러 추가 후 본 컨트롤러는 health check만 남기고
 * 검증용 라우트(`/whoami`, `/_test-throw`, `/_test-unknown-throw`)는 제거할 예정.
 *
 * `/_test-throw` / `/_test-unknown-throw` 는 운영 환경에서 404 처리 — 외부에서 임의로
 * 404/500을 발생시키는 모니터링 노이즈/장애 대응 혼선 방지.
 */
@ApiTags("app")
@Controller()
export class AppController implements OnModuleInit {
  private devRoutesEnabled = true;

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  onModuleInit() {
    this.devRoutesEnabled = DEV_ROUTE_ENABLED_ENVS.includes(this.config.nodeEnv);
  }

  /** 서비스 헬스 체크 — 인증 없이 접근 가능. */
  @Public()
  @Get("health")
  @ApiOperation({ summary: "Health check" })
  health() {
    return { status: "ok", service: "pullim-planner-backend" };
  }

  /**
   * MockAuthGuard 검증용 — `X-User-Id` 헤더가 있으면 그 값, 없으면 fallback `student_001`을 반환.
   */
  @Get("whoami")
  @ApiOperation({ summary: "Mock 인증 결과 확인 (X-User-Id 헤더)" })
  whoami(@CurrentUser() user: AuthenticatedUser) {
    return { userId: user.id };
  }

  /**
   * HttpExceptionFilter + envelope 검증용.
   * `ErrorMessages.PLANNER_NOT_FOUND`로 404를 던져 envelope 옵션 A 응답을 확인한다.
   *
   * production 환경에서는 일반 404를 반환해 라우트 자체를 숨긴다.
   */
  @Public()
  @Get("_test-throw")
  @ApiOperation({ summary: "[dev] HttpExceptionFilter 검증용 — 404 throw" })
  testThrow() {
    if (!this.devRoutesEnabled) {
      throw new NotFoundException(ErrorMessages.COMMON_NOT_FOUND);
    }
    throw new NotFoundException(ErrorMessages.PLANNER_NOT_FOUND);
  }

  /**
   * AllExceptionsFilter 검증용 — HttpException이 아닌 일반 Error를 던져 500을 유발한다.
   *
   * production 환경에서는 라우트 자체를 숨겨 임의 500 유발을 차단한다.
   */
  @Public()
  @Get("_test-unknown-throw")
  @ApiOperation({
    summary: "[dev] AllExceptionsFilter 검증용 — 일반 Error throw",
  })
  testUnknownThrow() {
    if (!this.devRoutesEnabled) {
      throw new NotFoundException(ErrorMessages.COMMON_NOT_FOUND);
    }
    throw new Error("Phase β unknown error verification");
  }
}
