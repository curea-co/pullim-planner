import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 플래너 과목 단원 — `planner_subject_units` 매핑. 복합 PK (planner_id, subject, position).
 * 스키마는 마이그레이션 소유(synchronize=false). FK planner_id → planners ON DELETE CASCADE.
 */
@Entity("planner_subject_units")
export class PlannerSubjectUnit {
  @PrimaryColumn({ type: "text" })
  plannerId: string;

  @PrimaryColumn({ type: "text" })
  subject: string;

  @PrimaryColumn({ type: "int" })
  position: number;

  @Column({ type: "text" })
  unitLabel: string;
}
