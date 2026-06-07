import { Injectable } from "@nestjs/common";

import { PlannerResponseDto } from "../controller/dto/planner-response.dto";
import { PlannerService } from "../service/planner.service";

/** `POST /api/planners/:id/duplicate` UseCase (Facade). */
@Injectable()
export class DuplicatePlannerUseCase {
  constructor(private readonly plannerService: PlannerService) {}

  execute(userId: string, plannerId: string): Promise<PlannerResponseDto> {
    return this.plannerService.duplicatePlanner(userId, plannerId);
  }
}
