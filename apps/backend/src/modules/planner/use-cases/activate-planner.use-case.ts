import { Injectable } from "@nestjs/common";

import { PlannerResponseDto } from "../controller/dto/planner-response.dto";
import { PlannerService } from "../service/planner.service";

/** `POST /api/planners/:id/activate` UseCase (Facade). */
@Injectable()
export class ActivatePlannerUseCase {
  constructor(private readonly plannerService: PlannerService) {}

  execute(userId: string, plannerId: string): Promise<PlannerResponseDto> {
    return this.plannerService.activatePlanner(userId, plannerId);
  }
}
