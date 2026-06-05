import type { BlockCompletion } from "../../../entities/block-completion.entity";
import type { Planner } from "../../../entities/planner.entity";
import type { PlannerSubjectUnit } from "../../../entities/planner-subject-unit.entity";
import type { TimeBlock } from "../../../entities/time-block.entity";
import type { DomainUser } from "../../auth/identity/domain-user.entity";

/** DI 토큰 (인터페이스는 런타임에 사라지므로 문자열 토큰으로 주입). */
export const PlannerRepositoryInterface = Symbol("PlannerRepositoryInterface");

/**
 * planner 도메인 데이터 접근. 조회(read) + 변경(write, Phase ε). 매핑/조립은 service 가 담당.
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

  // ── write (Phase ε — mutation) ───────────────────────────────────────────

  /** 플래너 1건 + 과목 단원을 한 트랜잭션으로 insert. */
  insertPlanner(planner: Planner, units: PlannerSubjectUnit[]): Promise<void>;

  /**
   * 플래너 편집 필드 전체 교체 + 과목 단원 재구성(delete 후 insert)을 한 트랜잭션으로.
   * id·userId·active·archived·createdAt 은 보존, updatedAt 갱신.
   */
  replacePlanner(planner: Planner, units: PlannerSubjectUnit[]): Promise<void>;

  /**
   * 플래너 삭제 (FK CASCADE 로 과목 단원·블록·완료 함께 제거). 활성 플래너는 삭제하지 않는다
   * (`active=false` 조건부) — read-then-write 사이 race 로 활성이 된 경우도 차단. 삭제된 행 수 반환.
   */
  deletePlanner(plannerId: string): Promise<number>;

  /**
   * 활성 플래너 전환 — 한 트랜잭션으로 사용자의 기존 active 를 모두 끄고 대상만 켠다.
   * partial unique index(`planners_user_active_uniq`) 위반을 피하려면 같은 tx 안에서
   * 비활성화가 먼저 일어나야 한다.
   */
  setActivePlanner(userId: string, plannerId: string): Promise<void>;

  /**
   * 아카이브 상태 토글 + updatedAt 갱신. archive(true) 는 활성 플래너에 적용하지 않는다
   * (`active=false` 조건부 — race 차단). 변경된 행 수 반환.
   */
  setArchived(plannerId: string, archived: boolean): Promise<number>;

  /** 시간표 꾸미기(customization jsonb) 저장 + updatedAt 갱신. */
  updateCustomization(
    plannerId: string,
    customization: Record<string, unknown>,
  ): Promise<void>;
}
