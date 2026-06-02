import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 인증 도메인 테이블 3종을 생성한다: auth_users, auth_user_providers,
 * refresh_token_blacklist.
 *
 * pullim_planner DB 가 보유한 Drizzle 시대 도메인 테이블(users/planners/time_blocks 등)은
 * 일절 건드리지 않는다. auth 는 별도 `auth_*` 네임스페이스로 격리한다.
 *
 * 이메일/제공자 유니크는 살아있는 행(deleted_at IS NULL)에만 거는 partial unique index 로
 * 두어 soft delete 후 재가입을 허용한다.
 */
export class CreateAuthTables1748736000000 implements MigrationInterface {
  name = "CreateAuthTables1748736000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // gen_random_uuid() 는 Postgres 13+ 에선 코어지만, 그 이전/일부 배포판에선 pgcrypto
    // 확장이 필요하다. fresh DB 에서 마이그레이션이 함수 미존재로 실패하지 않도록 보장한다.
    // (codex #40 round-2)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "auth_users_role_enum" AS ENUM ('user', 'admin');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "auth_user_providers_provider_enum" AS ENUM ('email', 'kakao', 'naver');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phone" character varying(20),
        "profile_image" text,
        "role" "auth_users_role_enum" NOT NULL DEFAULT 'user',
        "is_email_verified" boolean NOT NULL DEFAULT false,
        "marketing_consent" boolean NOT NULL DEFAULT false,
        "password_changed_at" timestamptz,
        CONSTRAINT "pk_auth_users" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_auth_users_email" ON "auth_users" ("email")
    `);
    // soft delete 재가입 허용: 살아있는 행에만 이메일 유니크 적용.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_auth_users_email"
      ON "auth_users" ("email") WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_user_providers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "provider" "auth_user_providers_provider_enum" NOT NULL,
        "provider_id" character varying NOT NULL,
        "password" character varying,
        "user_id" uuid NOT NULL,
        "failed_login_count" integer NOT NULL DEFAULT 0,
        "locked_at" timestamptz,
        CONSTRAINT "pk_auth_user_providers" PRIMARY KEY ("id"),
        CONSTRAINT "fk_auth_user_providers_user" FOREIGN KEY ("user_id")
          REFERENCES "auth_users" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_auth_user_providers_provider_id"
      ON "auth_user_providers" ("provider", "provider_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_auth_user_providers_provider_id"
      ON "auth_user_providers" ("provider", "provider_id") WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_token_blacklist" (
        "token_id" character varying(128) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_refresh_token_blacklist" PRIMARY KEY ("token_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_refresh_blacklist_expires_at"
      ON "refresh_token_blacklist" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_token_blacklist"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_user_providers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_users"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "auth_user_providers_provider_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "auth_users_role_enum"`);
  }
}
