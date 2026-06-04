import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * planner 도메인 테이블 7종을 생성한다: curriculum_nodes, planners,
 * planner_subject_units, time_blocks, block_completions, daily_conditions,
 * burnout_snapshots.
 *
 * 배경: 운영 DB(pullim_planner)에는 Drizzle 시대에 만들어진 이 테이블들이 이미 존재한다.
 * 하지만 fresh DB(신규 환경·CI·로컬 클린 부팅)에는 없다. 도메인 모듈(Phase δ~)과 seed 가
 * 이 테이블을 읽고 쓰므로, `synchronize=false` 인 상태에서 본 마이그레이션이 스키마의 단일
 * 진실 원천으로서 생성한다.
 *
 * 멱등성: `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` — 운영 DB 의 기존
 * Drizzle 테이블을 절대 건드리지 않는다. 제약/인덱스 이름은 운영 DB pg_dump 와 byte-equal
 * 로 맞춘다(Phase γ 완료 기준: pg_dump --schema-only diff 0).
 *
 * 실행 순서: 타임스탬프 prefix(1748737000000)가 users(1748735000000)·auth(1748736000000)
 * 뒤라, FK 부모인 users 가 먼저 존재함을 보장한다. 테이블 생성 순서는 FK 의존도 따른다
 * (curriculum_nodes/planners → 자식들).
 */
export class CreateDomainTables1748737000000 implements MigrationInterface {
  name = "CreateDomainTables1748737000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // curriculum_nodes — 자기참조 트리(parent_id → 자기 PK).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "curriculum_nodes" (
        "id" text NOT NULL,
        "parent_id" text,
        "subject" text NOT NULL,
        "level" smallint NOT NULL,
        "label" text NOT NULL,
        "position" integer NOT NULL DEFAULT 0,
        CONSTRAINT "curriculum_nodes_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "curriculum_nodes_parent_id_curriculum_nodes_id_fk"
          FOREIGN KEY ("parent_id") REFERENCES "curriculum_nodes"("id") ON DELETE CASCADE
      )
    `);

    // pedagogy_engines — 정적 참조 데이터.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pedagogy_engines" (
        "id" text NOT NULL,
        "label" text NOT NULL,
        "principle" text NOT NULL,
        "example" text NOT NULL,
        CONSTRAINT "pedagogy_engines_pkey" PRIMARY KEY ("id")
      )
    `);

    // planners — user 당 active=true·archived=false 1행(partial unique index).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "planners" (
        "id" text NOT NULL,
        "user_id" text NOT NULL,
        "name" text NOT NULL,
        "exam_type" text NOT NULL,
        "exam_label" text NOT NULL,
        "exam_start_date" date NOT NULL,
        "exam_end_date" date NOT NULL,
        "target_kind" text NOT NULL,
        "target_value" text NOT NULL,
        "weekday_start" integer NOT NULL,
        "weekday_end" integer NOT NULL,
        "weekend_start" integer NOT NULL,
        "weekend_end" integer NOT NULL,
        "block_pattern" text NOT NULL,
        "weakness_auto_reflect" boolean NOT NULL,
        "motivation_style" text NOT NULL,
        "motto" text,
        "active" boolean NOT NULL DEFAULT false,
        "archived" boolean NOT NULL DEFAULT false,
        "customization" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "planners_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "planners_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "planners_user_active_uniq" ON "planners" ("user_id") WHERE ("active" = true AND "archived" = false)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "planners_user_idx" ON "planners" ("user_id")`,
    );

    // planner_subject_units — 복합 PK (planner_id, subject, position).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "planner_subject_units" (
        "planner_id" text NOT NULL,
        "subject" text NOT NULL,
        "unit_label" text NOT NULL,
        "position" integer NOT NULL,
        CONSTRAINT "planner_subject_units_planner_id_subject_position_pk"
          PRIMARY KEY ("planner_id", "subject", "position"),
        CONSTRAINT "planner_subject_units_planner_id_planners_id_fk"
          FOREIGN KEY ("planner_id") REFERENCES "planners"("id") ON DELETE CASCADE
      )
    `);

    // time_blocks — FK planner_id(CASCADE) + curriculum_node_id(SET NULL).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "time_blocks" (
        "id" text NOT NULL,
        "planner_id" text NOT NULL,
        "date" date NOT NULL,
        "start_time" time without time zone NOT NULL,
        "end_time" time without time zone NOT NULL,
        "subject" text NOT NULL,
        "type" text NOT NULL,
        "title" text NOT NULL,
        "linked_feature_slug" text,
        "curriculum_node_id" text,
        "engines" text[] NOT NULL DEFAULT '{}'::text[],
        "status" text NOT NULL,
        "progress" real NOT NULL DEFAULT 0,
        "expected_minutes" integer NOT NULL,
        "reasoning" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "time_blocks_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "time_blocks_planner_id_planners_id_fk"
          FOREIGN KEY ("planner_id") REFERENCES "planners"("id") ON DELETE CASCADE,
        CONSTRAINT "time_blocks_curriculum_node_id_curriculum_nodes_id_fk"
          FOREIGN KEY ("curriculum_node_id") REFERENCES "curriculum_nodes"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "time_blocks_planner_date_idx" ON "time_blocks" ("planner_id", "date")`,
    );

    // block_completions — block_id PK(블록당 1건).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "block_completions" (
        "block_id" text NOT NULL,
        "completed_at" timestamptz NOT NULL,
        "accuracy" integer,
        "emotion" smallint,
        "notes" text,
        CONSTRAINT "block_completions_pkey" PRIMARY KEY ("block_id"),
        CONSTRAINT "block_completions_block_id_time_blocks_id_fk"
          FOREIGN KEY ("block_id") REFERENCES "time_blocks"("id") ON DELETE CASCADE
      )
    `);

    // daily_conditions — 복합 PK (user_id, date).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "daily_conditions" (
        "user_id" text NOT NULL,
        "date" date NOT NULL,
        "level" smallint NOT NULL,
        "reported_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "daily_conditions_user_id_date_pk" PRIMARY KEY ("user_id", "date"),
        CONSTRAINT "daily_conditions_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // burnout_snapshots — 복합 PK (user_id, date).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "burnout_snapshots" (
        "user_id" text NOT NULL,
        "date" date NOT NULL,
        "score" smallint NOT NULL,
        "trend" text NOT NULL,
        "recommend_break" boolean NOT NULL,
        "factors" jsonb NOT NULL,
        "computed_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "burnout_snapshots_user_id_date_pk" PRIMARY KEY ("user_id", "date"),
        CONSTRAINT "burnout_snapshots_user_id_users_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(): Promise<void> {
    // 의도적 no-op (CreateDomainUsersTable 과 동일 근거).
    //
    // up() 이 `CREATE TABLE IF NOT EXISTS` 라, 이 마이그레이션이 테이블을 실제로 만들었는지
    // (fresh DB) 이미 있던 운영 테이블을 건너뛴 것인지(Drizzle 시대) 구분할 수 없다. revert 에서
    // DROP 하면 운영 DB 의 진짜 도메인 데이터를 파괴할 수 있으므로 아무것도 하지 않는다.
    // fresh DB 를 비우려면 DB 자체를 drop/recreate 한다.
  }
}
