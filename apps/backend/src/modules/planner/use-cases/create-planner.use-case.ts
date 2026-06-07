import { Injectable } from "@nestjs/common";

import { PlannerResponseDto } from "../controller/dto/planner-response.dto";
import { PlannerWriteDto } from "../controller/dto/planner-write.dto";
import { PlannerService } from "../service/planner.service";

/** `POST /api/planners` UseCase (Facade). */
@Injectable()
export class CreatePlannerUseCase {
  constructor(private readonly plannerService: PlannerService) {}

  execute(userId: string, dto: PlannerWriteDto): Promise<PlannerResponseDto> {
    return this.plannerService.createPlanner(userId, dto);
  }
}
