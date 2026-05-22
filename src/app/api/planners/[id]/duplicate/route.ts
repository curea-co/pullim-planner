import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { planners, plannerSubjectUnits } from '@/lib/db/schema';
import { getUserId } from '../../../_lib/auth';
import { apiError } from '../../../_lib/response';
import { reshapePlanner } from '../../../_lib/planner-shape';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  const { id } = await ctx.params;

  const source = await db.query.planners.findFirst({
    where: eq(planners.id, id),
    with: { subjectUnits: true },
  });
  if (!source) return apiError('not_found', `Planner ${id} not found`);
  if (source.userId !== userId) return apiError('forbidden', `Planner ${id} is not yours`);

  const newId = newPlannerId();

  const duplicated = await db.transaction(async (tx) => {
    await tx.insert(planners).values({
      id: newId,
      userId,
      name: `${source.name} (복사)`,
      examType: source.examType,
      examLabel: source.examLabel,
      examStartDate: source.examStartDate,
      examEndDate: source.examEndDate,
      targetKind: source.targetKind,
      targetValue: source.targetValue,
      weekdayStart: source.weekdayStart,
      weekdayEnd: source.weekdayEnd,
      weekendStart: source.weekendStart,
      weekendEnd: source.weekendEnd,
      blockPattern: source.blockPattern,
      weaknessAutoReflect: source.weaknessAutoReflect,
      motivationStyle: source.motivationStyle,
      motto: source.motto,
      active: false,
      archived: false,
      customization: source.customization,
    });

    if (source.subjectUnits.length > 0) {
      await tx.insert(plannerSubjectUnits).values(
        source.subjectUnits.map((u) => ({
          plannerId: newId,
          subject: u.subject,
          unitLabel: u.unitLabel,
          position: u.position,
        })),
      );
    }

    const row = await tx.query.planners.findFirst({
      where: eq(planners.id, newId),
      with: { subjectUnits: true },
    });
    if (!row) throw new Error('Planner missing after duplicate');
    return row;
  });

  return new Response(JSON.stringify({ data: reshapePlanner(duplicated) }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
}

function newPlannerId(): string {
  return `pl_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}
