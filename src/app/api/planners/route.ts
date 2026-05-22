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

  let created;
  try {
    created = await db.transaction(async (tx) => {
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
  } catch (err) {
    // 존재하지 않는 X-User-Id → FK 위반(23503)을 domain error로 번역.
    // (/api/me는 user 누락 시 404로 명시하고 있으므로 POST도 정합.)
    if (isForeignKeyViolation(err)) {
      return apiError('not_found', `User ${userId} not found`);
    }
    throw err;
  }

  return new Response(JSON.stringify({ data: reshapePlanner(created) }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
}

function isForeignKeyViolation(err: unknown): boolean {
  // drizzle은 pg 에러를 DrizzleQueryError로 wrap — code는 err.cause.code 에 위치.
  // 안전성 위해 양쪽 모두 확인.
  return getPgErrorCode(err) === '23503';
}

function getPgErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const top = (err as { code?: unknown }).code;
  if (typeof top === 'string') return top;
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause === 'object' && cause !== null) {
    const c = (cause as { code?: unknown }).code;
    if (typeof c === 'string') return c;
  }
  return undefined;
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
