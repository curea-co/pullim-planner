import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { ErrorMessages } from "../../../common/constants/error-messages.constant";
import { BlockResponseDto } from "../controller/dto/block-response.dto";
import { MeResponseDto } from "../controller/dto/me-response.dto";
import { PlannerResponseDto } from "../controller/dto/planner-response.dto";
import { PlannerRepositoryInterface } from "../interface/planner-repository.interface";

/**
 * planner 도메인 read 서비스. 리포지토리 조회 결과를 mock 정합 DTO 로 조립한다.
 * Phase δ — read 3건(/me, /planners, /planners/:id/blocks).
 */
@Injectable()
export class PlannerService {
  constructor(
    @Inject(PlannerRepositoryInterface)
    private readonly repo: PlannerRepositoryInterface,
  ) {}

  /** 현재 사용자(도메인 users) + 활성 플래너 시험 정보. 사용자 없으면 404. */
  async getMe(userId: string): Promise<MeResponseDto> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    const activePlanner = await this.repo.findActivePlanner(userId);
    return MeResponseDto.from(user, activePlanner);
  }

  /** 사용자의 플래너 목록(active/inactive/archived 함께) + 과목 단원 조립. */
  async getPlanners(userId: string): Promise<PlannerResponseDto[]> {
    const planners = await this.repo.findPlannersByUser(userId);
    if (planners.length === 0) return [];

    const units = await this.repo.findSubjectUnits(planners.map((p) => p.id));
    const unitsByPlanner = new Map<string, typeof units>();
    for (const unit of units) {
      const list = unitsByPlanner.get(unit.plannerId) ?? [];
      list.push(unit);
      unitsByPlanner.set(unit.plannerId, list);
    }

    return planners.map((planner) =>
      PlannerResponseDto.from(planner, unitsByPlanner.get(planner.id) ?? []),
    );
  }

  /**
   * 플래너의 특정 날짜 블록 + 완료 기록 조립. 없으면 404, 타인 소유면 403
   * (권위 spec §3.2 / archive phase-3 권한 모델: not_found vs forbidden 구분).
   */
  async getBlocks(
    userId: string,
    plannerId: string,
    date: string,
  ): Promise<BlockResponseDto[]> {
    const planner = await this.repo.findPlannerById(plannerId);
    if (!planner) {
      throw new NotFoundException(ErrorMessages.PLANNER_NOT_FOUND);
    }
    if (planner.userId !== userId) {
      throw new ForbiddenException(ErrorMessages.COMMON_FORBIDDEN);
    }

    const blocks = await this.repo.findBlocksByDate(plannerId, date);
    if (blocks.length === 0) return [];

    const completions = await this.repo.findCompletions(
      blocks.map((b) => b.id),
    );
    const completionByBlock = new Map(completions.map((c) => [c.blockId, c]));

    return blocks.map((block) =>
      BlockResponseDto.from(block, completionByBlock.get(block.id)),
    );
  }
}
