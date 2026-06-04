import { Controller, Get, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { Public } from "../../../common/decorators/public.decorator";
import { getCurrentUserId } from "../../../common/utils/request.util";
import { MeResponseDto } from "./dto/me-response.dto";
import { GetMeUseCase } from "../use-cases/get-me.use-case";

/**
 * 현재 사용자(페르소나) 조회. Phase δ 단계라 `@Public()` — 미인증이면 `getCurrentUserId`
 * 가 데모 사용자(student_001)로 폴백한다. 인증 필수 전환은 Phase 3(GATED).
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
