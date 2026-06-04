import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { BlockCompletion } from "../../../entities/block-completion.entity";
import { Planner } from "../../../entities/planner.entity";
import { PlannerSubjectUnit } from "../../../entities/planner-subject-unit.entity";
import { TimeBlock } from "../../../entities/time-block.entity";
import { DomainUser } from "../../auth/identity/domain-user.entity";
import type { PlannerRepositoryInterface } from "../interface/planner-repository.interface";

/**
 * planner 도메인 read 리포지토리 (TypeORM). synchronize=false 매핑 엔티티 조회 전용.
 */
@Injectable()
export class PlannerRepository implements PlannerRepositoryInterface {
  constructor(
    @InjectRepository(DomainUser)
    private readonly users: Repository<DomainUser>,
    @InjectRepository(Planner)
    private readonly planners: Repository<Planner>,
    @InjectRepository(PlannerSubjectUnit)
    private readonly subjectUnits: Repository<PlannerSubjectUnit>,
    @InjectRepository(TimeBlock)
    private readonly blocks: Repository<TimeBlock>,
    @InjectRepository(BlockCompletion)
    private readonly completions: Repository<BlockCompletion>,
  ) {}

  findUserById(userId: string): Promise<DomainUser | null> {
    return this.users.findOne({ where: { id: userId } });
  }

  findPlannersByUser(
    userId: string,
    includeArchived: boolean,
  ): Promise<Planner[]> {
    const where = includeArchived ? { userId } : { userId, archived: false };
    // active 먼저, 그다음 최신 수정순 — 카드 그리드 표시 순서.
    return this.planners.find({
      where,
      order: { active: "DESC", updatedAt: "DESC" },
    });
  }

  findPlannerById(plannerId: string): Promise<Planner | null> {
    return this.planners.findOne({ where: { id: plannerId } });
  }

  findSubjectUnits(plannerIds: string[]): Promise<PlannerSubjectUnit[]> {
    if (plannerIds.length === 0) return Promise.resolve([]);
    return this.subjectUnits.find({
      where: { plannerId: In(plannerIds) },
      order: { position: "ASC" },
    });
  }

  findBlocksByDate(plannerId: string, date: string): Promise<TimeBlock[]> {
    return this.blocks.find({
      where: { plannerId, date },
      order: { startTime: "ASC" },
    });
  }

  findCompletions(blockIds: string[]): Promise<BlockCompletion[]> {
    if (blockIds.length === 0) return Promise.resolve([]);
    return this.completions.find({ where: { blockId: In(blockIds) } });
  }
}
