import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { planners, plannerSubjectUnits } from '@/lib/db/schema';
import { getUserId } from '../_lib/auth';
import { apiError, ok } from '../_lib/response';
import { reshapePlanner } from '../_lib/planner-shape';
import { parsePlannerCreate, readJson, validatePlannerInvariants } from '../_lib/validation';

export async function GET(req: Request) {
  const userId = getUserId(req);

  const rows = await db.query.planners.findMany({
    where: eq(planners.userId, userId),
    with: { subjectUnits: true },
  });

  return ok(rows.map(reshapePlanner));
}

export async function POST(req: Request) {
  const userId = getUserId(req);

  const body = await readJson(req);
  if (!body.ok) return apiError('validation_failed', body.message);

  const parsed = parsePlannerCreate(body.data);
  if (!parsed.ok) return apiError('validation_failed', parsed.message);

  const data = parsed.data;
  const invariants = validatePlannerInvariants(data);
  if (!invariants.ok) return apiError('validation_failed', invariants.message);

  const id = newPlannerId();

  const created = await db.transaction(async (tx) => {
    await tx.insert(planners).values({
      id,
      userId,
      name: data.name,
      examType: data.examType,
      examLabel: data.examLabel,
      examStartDate: data.examStartDate,
      examEndDate: data.examEndDate,
      targetKind: data.targetKind,
      targetValue: data.targetValue,
      weekdayStart: data.weekdayStart,
      weekdayEnd: data.weekdayEnd,
      weekendStart: data.weekendStart,
      weekendEnd: data.weekendEnd,
      blockPattern: data.blockPattern,
      weaknessAutoReflect: data.weaknessAutoReflect,
      motivationStyle: data.motivationStyle,
      motto: data.motto,
      active: false,
      archived: false,
      customization: data.customization,
    });

    const unitRows = subjectUnitsToRows(id, data.subjectUnits);
    if (unitRows.length > 0) {
      await tx.insert(plannerSubjectUnits).values(unitRows);
    }

    const row = await tx.query.planners.findFirst({
      where: eq(planners.id, id),
      with: { subjectUnits: true },
    });
    if (!row) {
      throw new Error('Created planner not found after insert');
    }
    return row;
  });

  return new Response(JSON.stringify({ data: reshapePlanner(created) }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
}

function newPlannerId(): string {
  return `pl_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function subjectUnitsToRows(
  plannerId: string,
  subjectUnits: Record<string, string[]>,
) {
  const rows: Array<{
    plannerId: string;
    subject: string;
    unitLabel: string;
    position: number;
  }> = [];
  for (const [subject, units] of Object.entries(subjectUnits)) {
    units.forEach((unitLabel, position) => {
      rows.push({ plannerId, subject, unitLabel, position });
    });
  }
  return rows;
}
