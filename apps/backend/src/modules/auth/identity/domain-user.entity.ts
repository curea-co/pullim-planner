import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * 도메인 `users` 테이블 매핑 (Drizzle 시대 스키마, `id text` PK).
 *
 * 이 테이블은 auth 가 소유하지 않는다 — 이미 존재하며, planner 도메인(planners/time_blocks
 * 등)이 `user_id text` FK 로 참조한다. 따라서 본 엔티티는 **읽기/신원 프로비저닝 전용**이며
 * 스키마 변경(synchronize/migration) 대상이 아니다 (DATABASE_SYNCHRONIZE=false 유지 필수).
 *
 * 신원 단일화(Phase 1): 가입 시 `auth_users.id`(uuid 문자열)를 본 테이블의 `id`(text)에
 * 그대로 복사해 행을 만든다. 온보딩 전이므로 도메인 NOT NULL 필드는 플레이스홀더 기본값으로
 * 채운다 (온보딩에서 실제 값으로 갱신).
 */
@Entity("users")
export class DomainUser {
  @PrimaryColumn({
    type: "text",
    comment: "auth_users.id 와 동일한 uuid 문자열",
  })
  id: string;

  @Column({ type: "text" })
  name: string;

  @Column({ type: "text" })
  grade: string;

  @Column({ type: "text" })
  track: string;

  @Column({ type: "text", nullable: true })
  school: string | null;

  @Column({
    type: "text",
    array: true,
    name: "focus_subjects",
    default: () => "'{}'",
  })
  focusSubjects: string[];

  @Column({ type: "int", name: "weekly_hours" })
  weeklyHours: number;

  @Column({ type: "text", name: "preferred_study_time" })
  preferredStudyTime: string;

  // 레거시 Drizzle 스키마는 `joined_at timestamp NOT NULL` (timezone 없음, 권위 spec
  // proc/spec/2026-05-18_be-api-design.md 73행). timestamptz 로 매핑하면 실제 컬럼 타입과
  // 어긋나 INSERT/조회 시 타임존 변환이 틀어진다. 레거시 컬럼 타입에 정확히 맞춘다 (codex #40 R3).
  @Column({ type: "timestamp", name: "joined_at" })
  joinedAt: Date;

  @Column({ type: "int", name: "streak_days", default: 0 })
  streakDays: number;
}
