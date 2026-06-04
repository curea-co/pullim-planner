import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 학습 시간 블록 — `time_blocks` 매핑. 스키마는 마이그레이션 소유(synchronize=false).
 *
 * 날짜/시간은 Drizzle 시대 타입 그대로: `date`(string), `time without time zone`(string).
 * FK: planner_id → planners CASCADE, curriculum_node_id → curriculum_nodes SET NULL.
 * 인덱스 `time_blocks_planner_date_idx`(planner_id, date)는 마이그레이션 소유.
 */
@Entity("time_blocks")
export class TimeBlock {
  @PrimaryColumn({ type: "text" })
  id: string;

  @Column({ type: "text" })
  plannerId: string;

  @Column({ type: "date" })
  date: string;

  @Column({ type: "time" })
  startTime: string;

  @Column({ type: "time" })
  endTime: string;

  @Column({ type: "text" })
  subject: string;

  @Column({ type: "text" })
  type: string;

  @Column({ type: "text" })
  title: string;

  @Column({ type: "text", nullable: true })
  linkedFeatureSlug: string | null;

  @Column({ type: "text", nullable: true })
  curriculumNodeId: string | null;

  @Column({ type: "text", array: true, default: () => "'{}'" })
  engines: string[];

  @Column({ type: "text" })
  status: string;

  @Column({ type: "real", default: 0 })
  progress: number;

  @Column({ type: "int" })
  expectedMinutes: number;

  @Column({ type: "text", nullable: true })
  reasoning: string | null;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt: Date;

  @Column({ type: "timestamptz", default: () => "now()" })
  updatedAt: Date;
}
