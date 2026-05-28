import { Controller, Get, NotFoundException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { ErrorMessages } from "./common/constants/error-messages.constant";
import {
  AuthenticatedUser,
  CurrentUser,
} from "./common/decorators/current-user.decorator";
import { Public } from "./common/decorators/public.decorator";

/**
 * Phase β 검증용 루트 컨트롤러.
 *
 * Phase γ에서 planner 도메인 컨트롤러 추가 후 본 컨트롤러는 health check만 남기고
 * 검증용 라우트(`/whoami`, `/_test-throw`, `/_test-unknown-throw`)는 제거할 예정.
 */
@ApiTags("app")
@Controller()
export class AppController {
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
   */
  @Public()
  @Get("_test-throw")
  @ApiOperation({ summary: "[dev] HttpExceptionFilter 검증용 — 404 throw" })
  testThrow() {
    throw new NotFoundException(ErrorMessages.PLANNER_NOT_FOUND);
  }

  /**
   * AllExceptionsFilter 검증용 — HttpException이 아닌 일반 Error를 던져 500을 유발한다.
   */
  @Public()
  @Get("_test-unknown-throw")
  @ApiOperation({
    summary: "[dev] AllExceptionsFilter 검증용 — 일반 Error throw",
  })
  testUnknownThrow() {
    throw new Error("Phase β unknown error verification");
  }
}
