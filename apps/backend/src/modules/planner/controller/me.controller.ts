import { Controller, Get, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { Public } from "../../../common/decorators/public.decorator";
import { getCurrentUserId } from "../../../common/utils/request.util";
import { MeResponseDto } from "./dto/me-response.dto";
import { GetMeUseCase } from "../use-cases/get-me.use-case";

/**
 * 현재 사용자(페르소나) 조회.
 *
 * Phase δ 는 `@Public()` 라 가드가 토큰을 검증/주입하지 않는다 — 즉 토큰 유무와 무관하게
 * `getCurrentUserId` 는 항상 데모 사용자(student_001)로 평가된다(단일 학습자 데모). 토큰 기반
 * per-user 식별·다계정 조회는 Phase 3(GATED)에서 `@Public()` 제거 + JwtAuthGuard 강제 시
 * 활성화된다(그 시점 `getCurrentUserId` 가 `req.user.id` 를 쓴다).
 */
@ApiTags("planner")
@Controller("me")
export class MeController {
  constructor(private readonly getMeUseCase: GetMeUseCase) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "현재 사용자(페르소나) 조회" })
  handle(@Req() req: Request): Promise<MeResponseDto> {
    return this.getMeUseCase.execute(getCurrentUserId(req));
  }
}
