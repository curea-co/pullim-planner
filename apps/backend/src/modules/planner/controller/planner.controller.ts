import { Controller, Get, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { Public } from "../../../common/decorators/public.decorator";
import { getCurrentUserId } from "../../../common/utils/request.util";
import { PlannerResponseDto } from "./dto/planner-response.dto";
import { PlannersQueryDto } from "./dto/planners-query.dto";
import { GetPlannersUseCase } from "../use-cases/get-planners.use-case";

/**
 * 시간표(플래너) 목록 조회. `@Public()` + getCurrentUserId 데모 폴백(Phase δ).
 */
@ApiTags("planner")
@Controller("planners")
export class PlannerController {
  constructor(private readonly getPlannersUseCase: GetPlannersUseCase) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "시간표 목록 (기본: archived 제외)" })
  handle(
    @Req() req: Request,
    @Query() query: PlannersQueryDto,
  ): Promise<PlannerResponseDto[]> {
    return this.getPlannersUseCase.execute(
      getCurrentUserId(req),
      query.includeArchived === "true",
    );
  }
}
