import { Controller, Get, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { getCurrentUserId } from "../../../common/utils/request.util";
import { MeResponseDto } from "./dto/me-response.dto";
import { GetMeUseCase } from "../use-cases/get-me.use-case";

/**
 * 현재 사용자(페르소나) 조회.
 *
 * Phase ε(per-user) — `@Public()` 제거. 실 부팅(DATABASE_ENABLED) 에선 전역 `JwtAuthGuard`
 * 가 토큰을 강제하고 `getCurrentUserId` 는 `req.user.id`(로그인 사용자)를 반환한다 →
 * 본인 페르소나만 조회. 토큰이 없으면 401. (스모크 부팅의 MockAuthGuard 는 데모 사용자 주입.)
 */
@ApiTags("planner")
@Controller("me")
export class MeController {
  constructor(private readonly getMeUseCase: GetMeUseCase) {}

  @Get()
  @ApiOperation({ summary: "현재 사용자(페르소나) 조회" })
  handle(@Req() req: Request): Promise<MeResponseDto> {
    return this.getMeUseCase.execute(getCurrentUserId(req));
  }
}
