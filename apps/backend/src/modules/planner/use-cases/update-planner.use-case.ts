import { Injectable } from "@nestjs/common";

import { PlannerResponseDto } from "../controller/dto/planner-response.dto";
import { PlannerWriteDto } from "../controller/dto/planner-write.dto";
import { PlannerService } from "../service/planner.service";

/** `PUT /api/planners/:id` UseCase (Facade). */
@Injectable()
export class UpdatePlannerUseCase {
  constructor(private readonly plannerService: PlannerService) {}

  execute(
    userId: string,
    plannerId: string,
    dto: PlannerWriteDto,
  ): Promise<PlannerResponseDto> {
    return this.plannerService.updatePlanner(userId, plannerId, dto);
  }
}
