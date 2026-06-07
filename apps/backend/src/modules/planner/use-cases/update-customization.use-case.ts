import { Injectable } from "@nestjs/common";

import { PlannerResponseDto } from "../controller/dto/planner-response.dto";
import { PlannerService } from "../service/planner.service";

/** `PUT /api/planners/:id/customization` UseCase (Facade). */
@Injectable()
export class UpdateCustomizationUseCase {
  constructor(private readonly plannerService: PlannerService) {}

  execute(
    userId: string,
    plannerId: string,
    customization: Record<string, unknown>,
  ): Promise<PlannerResponseDto> {
    return this.plannerService.updateCustomization(
      userId,
      plannerId,
      customization,
    );
  }
}
