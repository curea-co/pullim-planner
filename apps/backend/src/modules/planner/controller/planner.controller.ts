import { Controller, Get, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { Public } from "../../../common/decorators/public.decorator";
import { getCurrentUserId } from "../../../common/utils/request.util";
import { PlannerResponseDto } from "./dto/planner-response.dto";
import { GetPlannersUseCase } from "../use-cases/get-planners.use-case";

/**
 * 시간표(플래너) 목록 조회. spec §3 (192행) 계약대로 active/inactive/archived 를 함께
 * 내려준다(필터는 FE 의 mock getPlanners 처럼 클라이언트가 적용).
 *
 * Phase δ 는 `@Public()` 라 항상 데모 사용자(student_001)의 목록을 반환한다(토큰 미검증).
 * per-user/다계정 조회는 Phase 3(GATED)에서 `@Public()` 제거 시 활성화된다.
 */
@ApiTags("planner")
@Controller("planners")
export class PlannerController {
  constructor(private readonly getPlannersUseCase: GetPlannersUseCase) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "시간표 목록 (active/inactive/archived 함께)" })
  handle(@Req() req: Request): Promise<PlannerResponseDto[]> {
    return this.getPlannersUseCase.execute(getCurrentUserId(req));
  }
}
