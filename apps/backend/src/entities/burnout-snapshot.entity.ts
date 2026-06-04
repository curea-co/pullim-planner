import { Column, Entity, PrimaryColumn } from "typeorm";

/** 번아웃 요인 (jsonb `factors` 배열 원소). */
export interface BurnoutFactor {
  label: string;
  weight: number;
  detail?: string;
}

/**
 * 일일 번아웃 스냅샷 — `burnout_snapshots` 매핑. 복합 PK (user_id, date).
 * 스키마는 마이그레이션 소유. FK user_id → users ON DELETE CASCADE.
 */
@Entity("burnout_snapshots")
export class BurnoutSnapshot {
  @PrimaryColumn({ type: "text" })
  userId: string;

  @PrimaryColumn({ type: "date" })
  date: string;

  @Column({ type: "smallint" })
  score: number;

  @Column({ type: "text" })
  trend: string;

  @Column({ type: "boolean" })
  recommendBreak: boolean;

  @Column({ type: "jsonb" })
  factors: BurnoutFactor[];

  @Column({ type: "timestamptz", default: () => "now()" })
  computedAt: Date;
}
