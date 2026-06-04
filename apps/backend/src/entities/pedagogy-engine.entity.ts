import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 7대 교수학습 엔진 메타 — `pedagogy_engines` 매핑(정적 참조 데이터).
 * 스키마는 마이그레이션 소유(synchronize=false).
 */
@Entity("pedagogy_engines")
export class PedagogyEngine {
  @PrimaryColumn({ type: "text" })
  id: string;

  @Column({ type: "text" })
  label: string;

  @Column({ type: "text" })
  principle: string;

  @Column({ type: "text" })
  example: string;
}
