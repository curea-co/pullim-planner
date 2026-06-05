import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

import { BlockCompletion } from "../../../entities/block-completion.entity";
import { Planner } from "../../../entities/planner.entity";
import { PlannerSubjectUnit } from "../../../entities/planner-subject-unit.entity";
import { TimeBlock } from "../../../entities/time-block.entity";
import { DomainUser } from "../../auth/identity/domain-user.entity";
import type { PlannerRepositoryInterface } from "../interface/planner-repository.interface";

/**
 * planner 도메인 리포지토리 (TypeORM). synchronize=false 매핑 엔티티 조회/변경.
 * 다중 행을 한 번에 바꾸는 write 는 `DataSource.transaction` 으로 원자성을 보장한다.
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
    private readonly dataSource: DataSource,
  ) {}

  findUserById(userId: string): Promise<DomainUser | null> {
    return this.users.findOne({ where: { id: userId } });
  }

  findPlannersByUser(userId: string): Promise<Planner[]> {
    // active/inactive/archived 함께(spec §3). active 먼저, 그다음 최신 수정순.
    return this.planners.find({
      where: { userId },
      order: { active: "DESC", updatedAt: "DESC" },
    });
  }

  findPlannerById(plannerId: string): Promise<Planner | null> {
    return this.planners.findOne({ where: { id: plannerId } });
  }

  findActivePlanner(userId: string): Promise<Planner | null> {
    return this.planners.findOne({
      where: { userId, active: true, archived: false },
    });
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

  // ── write (Phase ε — mutation) ───────────────────────────────────────────

  async insertPlanner(
    planner: Planner,
    units: PlannerSubjectUnit[],
  ): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      // jsonb(customization) 컬럼 때문에 TypeORM 의 QueryDeepPartialEntity 와
      // 엔티티 타입이 정확히 일치하지 않아 캐스트한다(런타임 동작 동일).
      await m.insert(Planner, planner as QueryDeepPartialEntity<Planner>);
      if (units.length > 0) await m.insert(PlannerSubjectUnit, units);
    });
  }

  async replacePlanner(
    planner: Planner,
    units: PlannerSubjectUnit[],
  ): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      // id·userId·active·archived·createdAt 은 보존 — 편집 가능 필드만 갱신.
      await m.update(
        Planner,
        { id: planner.id },
        {
          name: planner.name,
          examType: planner.examType,
          examLabel: planner.examLabel,
          examStartDate: planner.examStartDate,
          examEndDate: planner.examEndDate,
          targetKind: planner.targetKind,
          targetValue: planner.targetValue,
          weekdayStart: planner.weekdayStart,
          weekdayEnd: planner.weekdayEnd,
          weekendStart: planner.weekendStart,
          weekendEnd: planner.weekendEnd,
          blockPattern: planner.blockPattern,
          weaknessAutoReflect: planner.weaknessAutoReflect,
          motivationStyle: planner.motivationStyle,
          motto: planner.motto,
          // customization 은 의도적으로 갱신하지 않는다 — 전용 엔드포인트
          // (PUT /planners/:id/customization) 소유라, 플래너 수정(PUT)이 omit 시 기존 값을
          // 덮어쓰면 꾸미기가 유실된다 (codex). 생성은 insertPlanner 가 설정한다.
          updatedAt: planner.updatedAt,
        },
      );
      // 과목 단원은 복합 PK 라 부분 갱신이 까다로워 delete 후 재삽입으로 교체.
      await m.delete(PlannerSubjectUnit, { plannerId: planner.id });
      if (units.length > 0) await m.insert(PlannerSubjectUnit, units);
    });
  }

  async deletePlanner(plannerId: string): Promise<number> {
    // active=false 조건부 — read-then-write 사이 활성화 race 에도 활성 플래너를 지우지 않는다.
    const res = await this.planners.delete({ id: plannerId, active: false });
    return res.affected ?? 0;
  }

  async setActivePlanner(userId: string, plannerId: string): Promise<number> {
    return this.dataSource.transaction(async (m) => {
      // 대상 행을 잠그고 archived 를 재확인한다 — race 로 archived 가 된 플래너를 활성화해
      // `active=true && archived=true` 불변식을 깨는 것을 막는다 (codex). archived 면 아무것도
      // 바꾸지 않고 0 반환.
      const target = await m.findOne(Planner, {
        where: { id: plannerId, archived: false },
        lock: { mode: "pessimistic_write" },
      });
      if (!target) return 0;
      // 같은 tx 안에서 기존 active 를 먼저 끈 뒤 대상을 켠다
      // (partial unique index `planners_user_active_uniq` 위반 방지).
      await m.update(
        Planner,
        { userId, active: true },
        { active: false, updatedAt: new Date() },
      );
      await m.update(
        Planner,
        { id: plannerId },
        { active: true, updatedAt: new Date() },
      );
      return 1;
    });
  }

  async setArchived(plannerId: string, archived: boolean): Promise<number> {
    // archive(true) 는 active=false 조건부 — 활성 플래너 아카이브 race 차단.
    // unarchive(false) 는 활성 제약 없음(애초에 archived=true 행만 대상).
    const where = archived
      ? { id: plannerId, active: false }
      : { id: plannerId };
    const res = await this.planners.update(where, {
      archived,
      updatedAt: new Date(),
    });
    return res.affected ?? 0;
  }

  async updateCustomization(
    plannerId: string,
    customization: Record<string, unknown>,
  ): Promise<void> {
    await this.planners.update({ id: plannerId }, {
      customization,
      updatedAt: new Date(),
    } as QueryDeepPartialEntity<Planner>);
  }
}
