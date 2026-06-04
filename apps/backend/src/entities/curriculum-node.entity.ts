import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 교육과정 노드 — `curriculum_nodes` 매핑. 자기참조 트리(parent_id → 자기 PK, ON DELETE
 * CASCADE). level 1=과목, 2=단원, 3=세부. 스키마는 마이그레이션 소유.
 *
 * 트리 관계는 `parentId` 컬럼으로만 보유한다(@Tree/@ManyToOne 미사용) — Phase δ/ζ 에서
 * parentId 로 트리를 구성한다.
 */
@Entity("curriculum_nodes")
export class CurriculumNode {
  @PrimaryColumn({ type: "text" })
  id: string;

  @Column({ type: "text", nullable: true })
  parentId: string | null;

  @Column({ type: "text" })
  subject: string;

  @Column({ type: "smallint" })
  level: number;

  @Column({ type: "text" })
  label: string;

  @Column({ type: "int", default: 0 })
  position: number;
}
