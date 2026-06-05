import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { todayKstIsoDate } from "../../../common/utils/datetime.util";
import { getCurrentUserId } from "../../../common/utils/request.util";
import { BlockResponseDto } from "./dto/block-response.dto";
import { BlocksQueryDto } from "./dto/blocks-query.dto";
import { GetPlannerBlocksUseCase } from "../use-cases/get-planner-blocks.use-case";

/**
 * 플래너의 날짜별 학습 블록 조회. date 미지정 시 KST 오늘.
 *
 * Phase ε(per-user) — `@Public()` 제거. 전역 `JwtAuthGuard` 가 토큰을 강제하고
 * `getCurrentUserId` 는 `req.user.id` 를 반환한다 → 소유권 검사도 로그인 사용자 기준.
 */
@ApiTags("planner")
@Controller("planners")
export class BlocksController {
  constructor(
    private readonly getPlannerBlocksUseCase: GetPlannerBlocksUseCase,
  ) {}

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
