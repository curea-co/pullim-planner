/**
 * Drizzle schema — 풀림 플래너 DB
 *
 * mock domain → BE 1차 정합 (proc/spec/2026-05-18_be-api-design.md §2).
 * 변경 시 `bunx drizzle-kit generate`로 SQL diff 생성.
 */

import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  integer,
  smallint,
  boolean,
  date,
  time,
  timestamp,
  jsonb,
  real,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

/* ─── users ───────────────────────────────────────────────────────────── */

export const users = pgTable('users', {
  id: text('id').primaryKey(),                          // 'student_001' (mock 호환)
  name: text('name').notNull(),
  grade: text('grade').notNull(),                       // '고1'|'고2'|'고3'|'재수'
  track: text('track').notNull(),                       // '문과'|'이과'|'예체능'
  school: text('school'),
  focusSubjects: text('focus_subjects').array().notNull().default(sql`'{}'::text[]`),
  weeklyHours: integer('weekly_hours').notNull(),
  preferredStudyTime: text('preferred_study_time').notNull(), // '아침'|'오후'|'저녁'|'심야'
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull(),
  streakDays: integer('streak_days').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  planners: many(planners),
  dailyConditions: many(dailyConditions),
  burnoutSnapshots: many(burnoutSnapshots),
}));

/* ─── planners ────────────────────────────────────────────────────────── */

export const planners = pgTable(
  'planners',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    examType: text('exam_type').notNull(),              // 'mock'|'suneung'|'midterm'|'final'|'other'
    examLabel: text('exam_label').notNull(),
    examStartDate: date('exam_start_date').notNull(),
    examEndDate: date('exam_end_date').notNull(),
    targetKind: text('target_kind').notNull(),          // 'grade'|'score'|'free'
    targetValue: text('target_value').notNull(),        // number → text (free일 때 문자열)
    weekdayStart: integer('weekday_start').notNull(),
    weekdayEnd: integer('weekday_end').notNull(),
    weekendStart: integer('weekend_start').notNull(),
    weekendEnd: integer('weekend_end').notNull(),
    blockPattern: text('block_pattern').notNull(),      // 'pomodoro'|'focused'|'deep'
    weaknessAutoReflect: boolean('weakness_auto_reflect').notNull(),
    motivationStyle: text('motivation_style').notNull(),// 'autonomous'|'guided'|'spartan'
    motto: text('motto'),
    active: boolean('active').notNull().default(false),
    archived: boolean('archived').notNull().default(false),
    customization: jsonb('customization').$type<{
      layoutId: string;
      weekLayoutId?: string;
      paletteId: string;
    } | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('planners_user_idx').on(table.userId),
    // 한 사용자당 active=true는 단 1행 — Drizzle partial unique index
    activePerUser: uniqueIndex('planners_user_active_uniq')
      .on(table.userId)
      .where(sql`${table.active} = true AND ${table.archived} = false`),
  }),
);

export const plannersRelations = relations(planners, ({ one, many }) => ({
  user: one(users, { fields: [planners.userId], references: [users.id] }),
  subjectUnits: many(plannerSubjectUnits),
  timeBlocks: many(timeBlocks),
}));

/* ─── planner_subject_units ────────────────────────────────────────────── */

export const plannerSubjectUnits = pgTable(
  'planner_subject_units',
  {
    plannerId: text('planner_id').notNull().references(() => planners.id, { onDelete: 'cascade' }),
    subject: text('subject').notNull(),                 // SubjectKey
    unitLabel: text('unit_label').notNull(),
    position: integer('position').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.plannerId, table.subject, table.position] }),
  }),
);

export const plannerSubjectUnitsRelations = relations(plannerSubjectUnits, ({ one }) => ({
  planner: one(planners, { fields: [plannerSubjectUnits.plannerId], references: [planners.id] }),
}));

/* ─── curriculum_nodes (3-Depth 트리) ──────────────────────────────────── */

export const curriculumNodes = pgTable('curriculum_nodes', {
  id: text('id').primaryKey(),                          // 'math.calc_diff.application'
  parentId: text('parent_id').references((): any => curriculumNodes.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  level: smallint('level').notNull(),                   // 1=과목, 2=단원, 3=세부
  label: text('label').notNull(),
  position: integer('position').notNull().default(0),
});

/* ─── time_blocks ──────────────────────────────────────────────────────── */

export const timeBlocks = pgTable(
  'time_blocks',
  {
    id: text('id').primaryKey(),
    plannerId: text('planner_id').notNull().references(() => planners.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),                       // YYYY-MM-DD
    startTime: time('start_time').notNull(),            // HH:MM
    endTime: time('end_time').notNull(),
    subject: text('subject').notNull(),                 // SubjectKey | 'rest'
    type: text('type').notNull(),                       // BlockType
    title: text('title').notNull(),
    linkedFeatureSlug: text('linked_feature_slug'),
    curriculumNodeId: text('curriculum_node_id').references(() => curriculumNodes.id, { onDelete: 'set null' }),
    engines: text('engines').array().notNull().default(sql`'{}'::text[]`), // PedagogyEngineId[]
    status: text('status').notNull(),                   // 'todo'|'doing'|'done'|'skipped'
    progress: real('progress').notNull().default(0),    // 0~1
    expectedMinutes: integer('expected_minutes').notNull(),
    reasoning: text('reasoning'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    plannerDateIdx: index('time_blocks_planner_date_idx').on(table.plannerId, table.date),
  }),
);

export const timeBlocksRelations = relations(timeBlocks, ({ one }) => ({
  planner: one(planners, { fields: [timeBlocks.plannerId], references: [planners.id] }),
  curriculumNode: one(curriculumNodes, { fields: [timeBlocks.curriculumNodeId], references: [curriculumNodes.id] }),
  completion: one(blockCompletions, { fields: [timeBlocks.id], references: [blockCompletions.blockId] }),
}));

/* ─── block_completions ────────────────────────────────────────────────── */

export const blockCompletions = pgTable('block_completions', {
  blockId: text('block_id').primaryKey().references(() => timeBlocks.id, { onDelete: 'cascade' }),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
  accuracy: integer('accuracy'),                        // 0~100
  emotion: smallint('emotion'),                         // 1~5
  notes: text('notes'),
});

/* ─── daily_conditions ─────────────────────────────────────────────────── */

export const dailyConditions = pgTable(
  'daily_conditions',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    level: smallint('level').notNull(),                 // 1~5
    reportedAt: timestamp('reported_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.date] }),
  }),
);

/* ─── burnout_snapshots ────────────────────────────────────────────────── */

export const burnoutSnapshots = pgTable(
  'burnout_snapshots',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    score: smallint('score').notNull(),                 // 0~100
    trend: text('trend').notNull(),                     // 'rising'|'stable'|'falling'
    recommendBreak: boolean('recommend_break').notNull(),
    factors: jsonb('factors').$type<Array<{
      label: string;
      value: number;
      unit: 'h' | '%' | '/5' | '회';
      weight: number;
      status: 'good' | 'warn' | 'bad';
    }>>().notNull(),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.date] }),
  }),
);

/* ─── pedagogy_engines (정적 seed) ─────────────────────────────────────── */

export const pedagogyEngines = pgTable('pedagogy_engines', {
  id: text('id').primaryKey(),                          // 'spaced_repetition' 등
  label: text('label').notNull(),
  principle: text('principle').notNull(),
  example: text('example').notNull(),
});

/* ─── 추론 타입 export ─────────────────────────────────────────────────── */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Planner = typeof planners.$inferSelect;
export type NewPlanner = typeof planners.$inferInsert;
export type TimeBlock = typeof timeBlocks.$inferSelect;
export type NewTimeBlock = typeof timeBlocks.$inferInsert;
export type BlockCompletion = typeof blockCompletions.$inferSelect;
export type DailyCondition = typeof dailyConditions.$inferSelect;
export type BurnoutSnapshot = typeof burnoutSnapshots.$inferSelect;
export type CurriculumNode = typeof curriculumNodes.$inferSelect;
export type PedagogyEngine = typeof pedagogyEngines.$inferSelect;
