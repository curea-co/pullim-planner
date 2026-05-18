/**
 * BE Phase 2 — mock data → DB seed.
 *
 * 실행:
 *   bun run db:seed
 *
 * 전제: docker compose up -d로 Postgres 컨테이너 + db:migrate로 9 테이블 생성된 상태.
 * 동작: 기존 데이터 모두 삭제 후 mock 재삽입 (idempotent).
 */

import { db } from '@/lib/db';
import {
  users,
  planners,
  plannerSubjectUnits,
  timeBlocks,
  blockCompletions,
  dailyConditions,
  burnoutSnapshots,
  curriculumNodes,
  pedagogyEngines,
} from '@/lib/db/schema';
import {
  currentPersona,
  todayBlocks,
  todayCondition,
  todayBurnout,
  planners as plannerData,
  pedagogyEngineMeta,
  allCurricula,
} from '@/lib/mock';
import { sql } from 'drizzle-orm';

// mock의 "오늘" 기준 날짜 — page.tsx의 nav label "2026.04.24 (목)"과 정합
const TODAY = '2026-04-24';
const ACTIVE_PLANNER = 'pl_001';

async function main() {
  console.log('🌱 풀림 플래너 seed 시작\n');

  /* 0. 기존 데이터 정리 — CASCADE FK로 자식 자동 삭제되지만 명시 순서로 안전하게 */
  await db.execute(sql`
    TRUNCATE
      block_completions,
      time_blocks,
      planner_subject_units,
      planners,
      burnout_snapshots,
      daily_conditions,
      users,
      curriculum_nodes,
      pedagogy_engines
    RESTART IDENTITY CASCADE
  `);
  console.log('✓ 기존 데이터 정리');

  /* 1. users — currentPersona */
  await db.insert(users).values({
    id: currentPersona.id,
    name: currentPersona.name,
    grade: currentPersona.grade,
    track: currentPersona.track,
    school: currentPersona.school,
    focusSubjects: currentPersona.focusSubjects,
    weeklyHours: currentPersona.weeklyHours,
    preferredStudyTime: currentPersona.preferredStudyTime,
    joinedAt: new Date(currentPersona.joinedAt),
    streakDays: currentPersona.streakDays,
  });
  console.log(`✓ users — ${currentPersona.name} (${currentPersona.id})`);

  /* 2. pedagogy_engines — 7대 학습과학 엔진 */
  for (const [id, meta] of Object.entries(pedagogyEngineMeta)) {
    await db.insert(pedagogyEngines).values({
      id,
      label: meta.label,
      principle: meta.principle,
      example: meta.example,
    });
  }
  console.log(`✓ pedagogy_engines — ${Object.keys(pedagogyEngineMeta).length}건`);

  /* 3. curriculum_nodes — 6 과목 트리. depth 1 → 2 → 3 순으로 (parent FK) */
  const trees = Object.values(allCurricula);
  let nodeCount = 0;
  // depth 1 (과목 root) → depth 2 (단원) → depth 3 (성취 기준) 순
  for (const depth of [1, 2, 3] as const) {
    for (const tree of trees) {
      const nodesAtDepth = tree.nodes.filter((n) => n.depth === depth);
      for (let i = 0; i < nodesAtDepth.length; i++) {
        const node = nodesAtDepth[i];
        await db.insert(curriculumNodes).values({
          id: node.id,
          parentId: node.parent ?? null,
          subject: tree.subject,
          level: depth,
          label: node.label,
          position: i,
        });
        nodeCount += 1;
      }
    }
  }
  console.log(`✓ curriculum_nodes — ${nodeCount}건 (6 과목 × 3 depth)`);

  /* 4. planners + planner_subject_units */
  for (const p of plannerData) {
    await db.insert(planners).values({
      id: p.id,
      userId: currentPersona.id,
      name: p.name,
      examType: p.examType,
      examLabel: p.examLabel,
      examStartDate: p.examStartDate,
      examEndDate: p.examEndDate,
      targetKind: p.target.kind,
      targetValue: String(p.target.value),
      weekdayStart: p.weekdayHours.start,
      weekdayEnd: p.weekdayHours.end,
      weekendStart: p.weekendHours.start,
      weekendEnd: p.weekendHours.end,
      blockPattern: p.blockPattern,
      weaknessAutoReflect: p.weaknessAutoReflect,
      motivationStyle: p.motivationStyle,
      motto: p.motto,
      active: p.active,
      archived: p.archived,
      customization: p.customization ?? null,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    });

    const subjectUnitEntries = Object.entries(p.subjectUnits);
    for (const [subject, units] of subjectUnitEntries) {
      if (!units) continue;
      for (let i = 0; i < units.length; i++) {
        await db.insert(plannerSubjectUnits).values({
          plannerId: p.id,
          subject,
          unitLabel: units[i],
          position: i,
        });
      }
    }
  }
  console.log(`✓ planners — ${plannerData.length}건 + subject units`);

  /* 5. time_blocks + block_completions — todayBlocks를 active planner에 */
  let completionCount = 0;
  for (const b of todayBlocks) {
    await db.insert(timeBlocks).values({
      id: b.id,
      plannerId: ACTIVE_PLANNER,
      date: TODAY,
      startTime: b.start,
      endTime: b.end,
      subject: b.subject,
      type: b.type,
      title: b.title,
      linkedFeatureSlug: b.linkedFeatureSlug ?? null,
      // curriculum FK는 노드 존재 시만 — 없으면 null (mock에 임의 id 있을 수 있음)
      curriculumNodeId: b.curriculumNodeId ?? null,
      engines: b.engines,
      status: b.status,
      progress: b.progress,
      expectedMinutes: b.expectedMinutes,
      reasoning: b.reasoning ?? null,
    });
    if (b.status === 'done') {
      await db.insert(blockCompletions).values({
        blockId: b.id,
        completedAt: new Date(`${TODAY}T${b.end}:00+09:00`),
        accuracy: b.accuracy ?? null,
        emotion: b.emotion ?? null,
      });
      completionCount += 1;
    }
  }
  console.log(`✓ time_blocks — ${todayBlocks.length}건 + block_completions ${completionCount}건`);

  /* 6. daily_conditions — 오늘 컨디션 */
  await db.insert(dailyConditions).values({
    userId: currentPersona.id,
    date: TODAY,
    level: todayCondition,
  });

  /* 7. burnout_snapshots — 오늘 번아웃 */
  await db.insert(burnoutSnapshots).values({
    userId: currentPersona.id,
    date: TODAY,
    score: todayBurnout.score,
    trend: todayBurnout.trend,
    recommendBreak: todayBurnout.recommendBreak,
    factors: todayBurnout.factors,
  });
  console.log(`✓ conditions + burnout — ${TODAY} 기준`);

  console.log('\n✨ seed 완료\n');
  console.log(`💡 확인: bun run db:studio (localhost:4983)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ seed 실패:', err);
    process.exit(1);
  });
