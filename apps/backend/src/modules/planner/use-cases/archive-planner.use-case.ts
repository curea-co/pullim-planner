import { Injectable } from "@nestjs/common";

import { PlannerResponseDto } from "../controller/dto/planner-response.dto";
import { PlannerService } from "../service/planner.service";

/** `POST /api/planners/:id/archive` · `/unarchive` UseCase (Facade). */
@Injectable()
export class ArchivePlannerUseCase {
  constructor(private readonly plannerService: PlannerService) {}

  archive(userId: string, plannerId: string): Promise<PlannerResponseDto> {
    return this.plannerService.archivePlanner(userId, plannerId);
  }

  unarchive(userId: string, plannerId: string): Promise<PlannerResponseDto> {
    return this.plannerService.unarchivePlanner(userId, plannerId);
  }
}
