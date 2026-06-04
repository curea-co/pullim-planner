import { Injectable } from "@nestjs/common";

import { MeResponseDto } from "../controller/dto/me-response.dto";
import { PlannerService } from "../service/planner.service";

/** `GET /api/me` UseCase (Facade). */
@Injectable()
export class GetMeUseCase {
  constructor(private readonly plannerService: PlannerService) {}

  execute(userId: string): Promise<MeResponseDto> {
    return this.plannerService.getMe(userId);
  }
}
