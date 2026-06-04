import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { Public } from "../../../common/decorators/public.decorator";
import { todayKstIsoDate } from "../../../common/utils/datetime.util";
import { getCurrentUserId } from "../../../common/utils/request.util";
import { BlockResponseDto } from "./dto/block-response.dto";
import { BlocksQueryDto } from "./dto/blocks-query.dto";
import { GetPlannerBlocksUseCase } from "../use-cases/get-planner-blocks.use-case";

/**
 * 플래너의 날짜별 학습 블록 조회. date 미지정 시 KST 오늘.
 *
 * Phase δ 는 `@Public()` 라 항상 데모 사용자(student_001)로 평가된다(토큰 미검증) — 따라서
 * 소유권 검사도 데모 사용자 기준이다. 토큰 기반 per-user 식별·다계정 소유권은 Phase 3(GATED)
 * 에서 `@Public()` 제거 시 활성화된다.
 */
@ApiTags("planner")
@Controller("planners")
export class BlocksController {
  constructor(
    private readonly getPlannerBlocksUseCase: GetPlannerBlocksUseCase,
  ) {}

  @Public()
  @Get(":id/blocks")
  @ApiOperation({ summary: "플래너 날짜별 블록 (date 기본: 오늘)" })
  handle(
    @Req() req: Request,
    @Param("id") id: string,
    @Query() query: BlocksQueryDto,
  ): Promise<BlockResponseDto[]> {
    const date = query.date ?? todayKstIsoDate();
    return this.getPlannerBlocksUseCase.execute(
      getCurrentUserId(req),
      id,
      date,
    );
  }
}
