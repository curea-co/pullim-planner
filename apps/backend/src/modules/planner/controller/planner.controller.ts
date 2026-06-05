import { Controller, Get, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { getCurrentUserId } from "../../../common/utils/request.util";
import { PlannerResponseDto } from "./dto/planner-response.dto";
import { GetPlannersUseCase } from "../use-cases/get-planners.use-case";

/**
 * 시간표(플래너) 목록 조회. spec §3 (192행) 계약대로 active/inactive/archived 를 함께
 * 내려준다(필터는 FE 의 mock getPlanners 처럼 클라이언트가 적용).
 *
 * Phase ε(per-user) — `@Public()` 제거. 전역 `JwtAuthGuard` 가 토큰을 강제하고
 * `getCurrentUserId` 는 `req.user.id` 를 반환한다 → 로그인 사용자 본인 목록만 조회.
 */
@ApiTags("planner")
@Controller("planners")
export class PlannerController {
  constructor(private readonly getPlannersUseCase: GetPlannersUseCase) {}

  @Get()
  @ApiOperation({ summary: "시간표 목록 (active/inactive/archived 함께)" })
  handle(@Req() req: Request): Promise<PlannerResponseDto[]> {
    return this.getPlannersUseCase.execute(getCurrentUserId(req));
  }
}
