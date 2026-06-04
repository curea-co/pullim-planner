import { Injectable } from "@nestjs/common";

import { BlockResponseDto } from "../controller/dto/block-response.dto";
import { PlannerService } from "../service/planner.service";

/** `GET /api/planners/:id/blocks` UseCase (Facade). */
@Injectable()
export class GetPlannerBlocksUseCase {
  constructor(private readonly plannerService: PlannerService) {}

  execute(
    userId: string,
    plannerId: string,
    date: string,
  ): Promise<BlockResponseDto[]> {
    return this.plannerService.getBlocks(userId, plannerId, date);
  }
}
