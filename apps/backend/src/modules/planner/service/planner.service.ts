import { randomUUID } from "node:crypto";

import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { ErrorMessages } from "../../../common/constants/error-messages.constant";
import { Planner } from "../../../entities/planner.entity";
import { PlannerSubjectUnit } from "../../../entities/planner-subject-unit.entity";
import { BlockResponseDto } from "../controller/dto/block-response.dto";
import { MeResponseDto } from "../controller/dto/me-response.dto";
import { PlannerResponseDto } from "../controller/dto/planner-response.dto";
import { PlannerWriteDto } from "../controller/dto/planner-write.dto";
import { PlannerRepositoryInterface } from "../interface/planner-repository.interface";

/**
 * planner 도메인 서비스. 리포지토리 조회 결과를 mock 정합 DTO 로 조립(read)하고,
 * mutation(Phase ε — create/update/delete/activate/archive/duplicate/customization)
 * 의 도메인 규칙(소유권·활성 불변식)을 강제한다.
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

  // ── mutation (Phase ε) ─────────────────────────────────────────────────

  /** 플래너 생성 — 신규는 항상 inactive·non-archived (mock createPlanner 정렬). */
  async createPlanner(
    userId: string,
    dto: PlannerWriteDto,
  ): Promise<PlannerResponseDto> {
    const id = `pl_${randomUUID()}`;
    const now = new Date();
    const planner = this.toEntity(id, userId, dto, {
      active: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
    const units = this.toUnits(id, dto.subjectUnits);
    await this.repo.insertPlanner(planner, units);
    return this.buildPlannerDto(id);
  }

  /** 플래너 편집 필드 전체 교체. 없으면 404, 타인 소유면 403. */
  async updatePlanner(
    userId: string,
    plannerId: string,
    dto: PlannerWriteDto,
  ): Promise<PlannerResponseDto> {
    await this.ownedOrThrow(userId, plannerId);
    const planner = this.toEntity(plannerId, userId, dto, {
      // active/archived/createdAt 은 repo.replacePlanner 가 보존하므로 placeholder.
      active: false,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const units = this.toUnits(plannerId, dto.subjectUnits);
    await this.repo.replacePlanner(planner, units);
    return this.buildPlannerDto(plannerId);
  }

  /** 플래너 삭제. 활성 플래너는 삭제 불가(409). */
  async deletePlanner(userId: string, plannerId: string): Promise<void> {
    const planner = await this.ownedOrThrow(userId, plannerId);
    if (planner.active) {
      throw new ConflictException(
        ErrorMessages.PLANNER_ACTIVE_DELETE_FORBIDDEN,
      );
    }
    await this.repo.deletePlanner(plannerId);
  }

  /** 활성 플래너 전환 — 다른 플래너는 모두 비활성. 아카이브된 건 활성화 불가(409). */
  async activatePlanner(
    userId: string,
    plannerId: string,
  ): Promise<PlannerResponseDto> {
    const planner = await this.ownedOrThrow(userId, plannerId);
    if (planner.archived) {
      throw new ConflictException(ErrorMessages.PLANNER_ACTIVE_CONFLICT);
    }
    await this.repo.setActivePlanner(userId, plannerId);
    return this.buildPlannerDto(plannerId);
  }

  /** 아카이브. 활성 플래너는 아카이브 불가(409) — 먼저 다른 플래너를 활성화해야 한다. */
  async archivePlanner(
    userId: string,
    plannerId: string,
  ): Promise<PlannerResponseDto> {
    const planner = await this.ownedOrThrow(userId, plannerId);
    if (planner.active) {
      throw new ConflictException(ErrorMessages.PLANNER_ACTIVE_CONFLICT);
    }
    await this.repo.setArchived(plannerId, true);
    return this.buildPlannerDto(plannerId);
  }

  /** 아카이브 해제. */
  async unarchivePlanner(
    userId: string,
    plannerId: string,
  ): Promise<PlannerResponseDto> {
    await this.ownedOrThrow(userId, plannerId);
    await this.repo.setArchived(plannerId, false);
    return this.buildPlannerDto(plannerId);
  }

  /** 플래너 복제 — 새 id, 이름에 "(복사)" 접미, 항상 inactive·non-archived. */
  async duplicatePlanner(
    userId: string,
    plannerId: string,
  ): Promise<PlannerResponseDto> {
    const src = await this.ownedOrThrow(userId, plannerId);
    const srcUnits = (await this.repo.findSubjectUnits([plannerId])).filter(
      (u) => u.plannerId === plannerId,
    );

    const id = `pl_${randomUUID()}`;
    const now = new Date();
    const dup: Planner = {
      ...src,
      id,
      name: `${src.name} (복사)`,
      active: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    const units = srcUnits.map((u) => {
      const unit = new PlannerSubjectUnit();
      unit.plannerId = id;
      unit.subject = u.subject;
      unit.position = u.position;
      unit.unitLabel = u.unitLabel;
      return unit;
    });
    await this.repo.insertPlanner(dup, units);
    return this.buildPlannerDto(id);
  }

  /** 시간표 꾸미기(layout/palette) 저장. */
  async updateCustomization(
    userId: string,
    plannerId: string,
    customization: Record<string, unknown>,
  ): Promise<PlannerResponseDto> {
    await this.ownedOrThrow(userId, plannerId);
    await this.repo.updateCustomization(plannerId, customization);
    return this.buildPlannerDto(plannerId);
  }

  // ── 내부 헬퍼 ──────────────────────────────────────────────────────────

  /** 소유권 확인 — 없으면 404, 타인 소유면 403, 통과 시 엔티티 반환. */
  private async ownedOrThrow(
    userId: string,
    plannerId: string,
  ): Promise<Planner> {
    const planner = await this.repo.findPlannerById(plannerId);
    if (!planner) {
      throw new NotFoundException(ErrorMessages.PLANNER_NOT_FOUND);
    }
    if (planner.userId !== userId) {
      throw new ForbiddenException(ErrorMessages.COMMON_FORBIDDEN);
    }
    return planner;
  }

  /** 변경 후 단건 재조회 → 응답 DTO 조립 (read 경로와 동일 매핑 재사용). */
  private async buildPlannerDto(
    plannerId: string,
  ): Promise<PlannerResponseDto> {
    const planner = await this.repo.findPlannerById(plannerId);
    if (!planner) {
      throw new NotFoundException(ErrorMessages.PLANNER_NOT_FOUND);
    }
    const units = (await this.repo.findSubjectUnits([plannerId])).filter(
      (u) => u.plannerId === plannerId,
    );
    return PlannerResponseDto.from(planner, units);
  }

  /**
   * 중첩 입력 DTO → 평면 엔티티 (`PlannerResponseDto.from` 의 역방향).
   * target.value 는 text 컬럼이라 String 으로 직렬화한다.
   */
  private toEntity(
    id: string,
    userId: string,
    dto: PlannerWriteDto,
    state: {
      active: boolean;
      archived: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
  ): Planner {
    const planner = new Planner();
    planner.id = id;
    planner.userId = userId;
    planner.name = dto.name;
    planner.examType = dto.examType;
    planner.examLabel = dto.examLabel;
    planner.examStartDate = dto.examStartDate;
    planner.examEndDate = dto.examEndDate;
    planner.targetKind = dto.target.kind;
    planner.targetValue = String(dto.target.value);
    planner.weekdayStart = dto.weekdayHours.start;
    planner.weekdayEnd = dto.weekdayHours.end;
    planner.weekendStart = dto.weekendHours.start;
    planner.weekendEnd = dto.weekendHours.end;
    planner.blockPattern = dto.blockPattern;
    planner.weaknessAutoReflect = dto.weaknessAutoReflect;
    planner.motivationStyle = dto.motivationStyle;
    planner.motto = dto.motto === "" ? null : dto.motto;
    planner.customization = dto.customization ? { ...dto.customization } : null;
    planner.active = state.active;
    planner.archived = state.archived;
    planner.createdAt = state.createdAt;
    planner.updatedAt = state.updatedAt;
    return planner;
  }

  /** 중첩 `subjectUnits` 맵 → 복합 PK(planner_id, subject, position) 행들. */
  private toUnits(
    plannerId: string,
    subjectUnits: Record<string, string[]>,
  ): PlannerSubjectUnit[] {
    const rows: PlannerSubjectUnit[] = [];
    for (const [subject, labels] of Object.entries(subjectUnits)) {
      labels.forEach((unitLabel, position) => {
        const unit = new PlannerSubjectUnit();
        unit.plannerId = plannerId;
        unit.subject = subject;
        unit.position = position;
        unit.unitLabel = unitLabel;
        rows.push(unit);
      });
    }
    return rows;
  }
}
