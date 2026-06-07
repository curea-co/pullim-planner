import { Injectable } from "@nestjs/common";

import { PlannerService } from "../service/planner.service";

/** `DELETE /api/planners/:id` UseCase (Facade). */
@Injectable()
export class DeletePlannerUseCase {
  constructor(private readonly plannerService: PlannerService) {}

  execute(userId: string, plannerId: string): Promise<void> {
    return this.plannerService.deletePlanner(userId, plannerId);
  }
}
