import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 일일 컨디션 — `daily_conditions` 매핑. 복합 PK (user_id, date).
 * 스키마는 마이그레이션 소유. FK user_id → users ON DELETE CASCADE.
 */
@Entity("daily_conditions")
export class DailyCondition {
  @PrimaryColumn({ type: "text" })
  userId: string;

  @PrimaryColumn({ type: "date" })
  date: string;

  @Column({ type: "smallint" })
  level: number;

  @Column({ type: "timestamptz", default: () => "now()" })
  reportedAt: Date;
}
