import type { BlockCompletion } from "../../../entities/block-completion.entity";
import type { Planner } from "../../../entities/planner.entity";
import type { PlannerSubjectUnit } from "../../../entities/planner-subject-unit.entity";
import type { TimeBlock } from "../../../entities/time-block.entity";
import type { DomainUser } from "../../auth/identity/domain-user.entity";

/** DI 토큰 (인터페이스는 런타임에 사라지므로 문자열 토큰으로 주입). */
export const PlannerRepositoryInterface = Symbol("PlannerRepositoryInterface");

/**
 * planner 도메인 read 데이터 접근. 순수 조회만 — 매핑/조립은 service 가 담당.
 */
export interface PlannerRepositoryInterface {
  /** 도메인 사용자(users) 1건. */
  findUserById(userId: string): Promise<DomainUser | null>;

  /** 사용자의 플래너 목록 — active/inactive/archived 함께(spec §3). active 우선 정렬. */
  findPlannersByUser(userId: string): Promise<Planner[]>;

  /** 플래너 1건 (소유권 확인용). */
  findPlannerById(plannerId: string): Promise<Planner | null>;

  /** 사용자의 활성 플래너(active·non-archived 1건). 시험 일정 파생용. */
  findActivePlanner(userId: string): Promise<Planner | null>;

  /** 여러 플래너의 과목 단원 (position 오름차순). */
  findSubjectUnits(plannerIds: string[]): Promise<PlannerSubjectUnit[]>;

  /** 플래너의 특정 날짜 블록 (시작 시각 오름차순). */
  findBlocksByDate(plannerId: string, date: string): Promise<TimeBlock[]>;

  /** 블록들의 완료 기록. */
  findCompletions(blockIds: string[]): Promise<BlockCompletion[]>;
}
