import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 시간표(플래너) 엔티티 — Drizzle 시대 `planners` 테이블 매핑.
 *
 * 도메인 테이블은 auth 가 아닌 Drizzle 시대 스키마(text PK, timestamptz)를 그대로 따른다.
 * `synchronize=false` — 스키마는 마이그레이션이 소유하고 본 엔티티는 읽기/쓰기 매핑만 한다.
 * 컬럼명은 전역 SnakeNamingStrategy 가 camelCase → snake_case 로 변환한다.
 *
 * 인덱스(`planners_user_idx`)와 partial unique index(`planners_user_active_uniq`,
 * user 당 active=true·archived=false 1행)는 마이그레이션이 소유한다 — partial 조건은
 * 엔티티 데코레이터로 표현되지 않으므로 여기엔 선언하지 않는다.
 */
@Entity("planners")
export class Planner {
  @PrimaryColumn({ type: "text" })
  id: string;

  @Column({ type: "text" })
  userId: string;

  @Column({ type: "text" })
  name: string;

  @Column({ type: "text" })
  examType: string;

  @Column({ type: "text" })
  examLabel: string;

  @Column({ type: "date" })
  examStartDate: string;

  @Column({ type: "date" })
  examEndDate: string;

  @Column({ type: "text" })
  targetKind: string;

  @Column({ type: "text" })
  targetValue: string;

  @Column({ type: "int" })
  weekdayStart: number;

  @Column({ type: "int" })
  weekdayEnd: number;

  @Column({ type: "int" })
  weekendStart: number;

  @Column({ type: "int" })
  weekendEnd: number;

  @Column({ type: "text" })
  blockPattern: string;

  @Column({ type: "boolean" })
  weaknessAutoReflect: boolean;

  @Column({ type: "text" })
  motivationStyle: string;

  @Column({ type: "text", nullable: true })
  motto: string | null;

  @Column({ type: "boolean", default: false })
  active: boolean;

  @Column({ type: "boolean", default: false })
  archived: boolean;

  @Column({ type: "jsonb", nullable: true })
  customization: Record<string, unknown> | null;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt: Date;

  @Column({ type: "timestamptz", default: () => "now()" })
  updatedAt: Date;
}
