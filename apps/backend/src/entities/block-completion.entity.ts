import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 블록 완료 기록 — `block_completions` 매핑 (block_id PK = 블록당 1건).
 * 스키마는 마이그레이션 소유. FK block_id → time_blocks ON DELETE CASCADE.
 */
@Entity("block_completions")
export class BlockCompletion {
  @PrimaryColumn({ type: "text" })
  blockId: string;

  @Column({ type: "timestamptz" })
  completedAt: Date;

  @Column({ type: "int", nullable: true })
  accuracy: number | null;

  @Column({ type: "smallint", nullable: true })
  emotion: number | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;
}
