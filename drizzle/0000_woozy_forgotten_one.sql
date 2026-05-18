CREATE TABLE "block_completions" (
	"block_id" text PRIMARY KEY NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"accuracy" integer,
	"emotion" smallint,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "burnout_snapshots" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"score" smallint NOT NULL,
	"trend" text NOT NULL,
	"recommend_break" boolean NOT NULL,
	"factors" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "burnout_snapshots_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "curriculum_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"subject" text NOT NULL,
	"level" smallint NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_conditions" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"level" smallint NOT NULL,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_conditions_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "pedagogy_engines" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"principle" text NOT NULL,
	"example" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_subject_units" (
	"planner_id" text NOT NULL,
	"subject" text NOT NULL,
	"unit_label" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "planner_subject_units_planner_id_subject_position_pk" PRIMARY KEY("planner_id","subject","position")
);
--> statement-breakpoint
CREATE TABLE "planners" (
	"id" text PRIMARY KEY NOT NULL,
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
	"active" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"customization" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"planner_id" text NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"subject" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"linked_feature_slug" text,
	"curriculum_node_id" text,
	"engines" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text NOT NULL,
	"progress" real DEFAULT 0 NOT NULL,
	"expected_minutes" integer NOT NULL,
	"reasoning" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"grade" text NOT NULL,
	"track" text NOT NULL,
	"school" text,
	"focus_subjects" text[] DEFAULT '{}'::text[] NOT NULL,
	"weekly_hours" integer NOT NULL,
	"preferred_study_time" text NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "block_completions" ADD CONSTRAINT "block_completions_block_id_time_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."time_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "burnout_snapshots" ADD CONSTRAINT "burnout_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_nodes" ADD CONSTRAINT "curriculum_nodes_parent_id_curriculum_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."curriculum_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_conditions" ADD CONSTRAINT "daily_conditions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_subject_units" ADD CONSTRAINT "planner_subject_units_planner_id_planners_id_fk" FOREIGN KEY ("planner_id") REFERENCES "public"."planners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planners" ADD CONSTRAINT "planners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_planner_id_planners_id_fk" FOREIGN KEY ("planner_id") REFERENCES "public"."planners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_curriculum_node_id_curriculum_nodes_id_fk" FOREIGN KEY ("curriculum_node_id") REFERENCES "public"."curriculum_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "planners_user_idx" ON "planners" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "planners_user_active_uniq" ON "planners" USING btree ("user_id") WHERE "planners"."active" = true AND "planners"."archived" = false;--> statement-breakpoint
CREATE INDEX "time_blocks_planner_date_idx" ON "time_blocks" USING btree ("planner_id","date");