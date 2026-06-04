import { Injectable } from "@nestjs/common";

import { PlannerResponseDto } from "../controller/dto/planner-response.dto";
import { PlannerService } from "../service/planner.service";

/** `GET /api/planners` UseCase (Facade). */
@Injectable()
export class GetPlannersUseCase {
  constructor(private readonly plannerService: PlannerService) {}

  execute(userId: string): Promise<PlannerResponseDto[]> {
    return this.plannerService.getPlanners(userId);
  }
}
