import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { planners } from '@/lib/db/schema';
import { getUserId } from '../_lib/auth';
import { ok } from '../_lib/response';

type PlannerRow = NonNullable<
  Awaited<ReturnType<typeof db.query.planners.findFirst>>
> & {
  subjectUnits: Array<{ subject: string; unitLabel: string; position: number }>;
};

export async function GET(req: Request) {
  const userId = getUserId(req);

  const rows = await db.query.planners.findMany({
    where: eq(planners.userId, userId),
    with: { subjectUnits: true },
  });

  return ok(rows.map(reshape));
}

function reshape(row: PlannerRow) {
  const subjectUnits: Record<string, string[]> = {};
  for (const u of [...row.subjectUnits].sort((a, b) => a.position - b.position)) {
    (subjectUnits[u.subject] ??= []).push(u.unitLabel);
  }

  return {
    id: row.id,
    name: row.name,
    examType: row.examType,
    examLabel: row.examLabel,
    examStartDate: row.examStartDate,
    examEndDate: row.examEndDate,
    target: { kind: row.targetKind, value: parseTargetValue(row.targetKind, row.targetValue) },
    weekdayHours: { start: row.weekdayStart, end: row.weekdayEnd },
    weekendHours: { start: row.weekendStart, end: row.weekendEnd },
    subjectUnits,
    blockPattern: row.blockPattern,
    weaknessAutoReflect: row.weaknessAutoReflect,
    motivationStyle: row.motivationStyle,
    motto: row.motto,
    active: row.active,
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customization: row.customization,
  };
}

function parseTargetValue(kind: string, value: string): number | string {
  if (kind === 'free') return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}
