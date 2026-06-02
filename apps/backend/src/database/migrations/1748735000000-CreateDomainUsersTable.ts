import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 도메인 `users` 테이블을 생성한다 (Drizzle 시대 스키마 호환).
 *
 * 배경: 운영 DB(pullim_planner)에는 Drizzle 시대에 만들어진 도메인 테이블
 * (`users`/`planners`/`time_blocks` 등)이 이미 존재한다. 하지만 **fresh DB**(신규 환경·CI·
 * 로컬 클린 부팅)에는 그 테이블들이 없다. 그런데 가입(SignupUseCase → DomainUserProvisioner)은
 * 신원 단일화를 위해 도메인 `users` 행을 INSERT 한다. `synchronize=false` 라 TypeORM 이
 * 테이블을 자동 생성하지 않으므로, fresh DB 에서는 `relation "users" does not exist` 로
 * 가입이 항상 500 롤백됐다 (PR#40 회귀).
 *
 * 따라서 본 마이그레이션이 `users` 를 스키마의 단일 진실 원천으로서 생성한다. 컬럼은
 * `DomainUser` 엔티티(`apps/backend/src/modules/auth/identity/domain-user.entity.ts`)와
 * SnakeNamingStrategy(camelCase → snake_case)에 정확히 맞춘다.
 *
 * 멱등성: 이미 `users` 가 존재하는 운영 DB(Drizzle 시대)에서는 `CREATE TABLE IF NOT EXISTS`
 * 로 아무 일도 하지 않는다 — 기존 도메인 데이터를 절대 건드리지 않는다.
 *
 * 실행 순서: 타임스탬프 prefix(1748735000000)가 auth 마이그레이션(1748736000000)보다 앞서
 * `users` 가 가입 경로보다 먼저 존재함을 보장한다.
 */
export class CreateDomainUsersTable1748735000000 implements MigrationInterface {
  name = "CreateDomainUsersTable1748735000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 운영 DB 에 이미 존재하면 건드리지 않고, fresh DB 에서만 생성한다.
    // 컬럼 타입은 DomainUser 엔티티와 1:1 정합 (id text PK / focus_subjects text[] NOT NULL /
    // joined_at 은 timezone 없는 timestamp — 레거시 Drizzle 컬럼 타입과 일치, codex #40 R3).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" text NOT NULL,
        "name" text NOT NULL,
        "grade" text NOT NULL,
        "track" text NOT NULL,
        "school" text,
        "focus_subjects" text[] NOT NULL DEFAULT '{}',
        "weekly_hours" integer NOT NULL,
        "preferred_study_time" text NOT NULL,
        "joined_at" timestamp NOT NULL,
        "streak_days" integer NOT NULL DEFAULT 0,
        CONSTRAINT "pk_users" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 본 마이그레이션이 fresh DB 에서 만든 테이블만 되돌린다. 운영 DB 에서 revert 시에도
    // 도메인 데이터가 없는 fresh 환경을 전제로 한 것이므로 DROP 한다.
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
