import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { planners, plannerSubjectUnits } from '@/lib/db/schema';
import { getUserId } from '../../_lib/auth';
import { apiError, ok } from '../../_lib/response';
import { reshapePlanner } from '../../_lib/planner-shape';
import { parsePlannerPatch, readJson } from '../../_lib/validation';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  const { id } = await ctx.params;

  const row = await db.query.planners.findFirst({
    where: eq(planners.id, id),
    with: { subjectUnits: true },
  });
  if (!row) return apiError('not_found', `Planner ${id} not found`);
  if (row.userId !== userId) return apiError('forbidden', `Planner ${id} is not yours`);

  return ok(reshapePlanner(row));
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  const { id } = await ctx.params;

  const existing = await db.query.planners.findFirst({ where: eq(planners.id, id) });
  if (!existing) return apiError('not_found', `Planner ${id} not found`);
  if (existing.userId !== userId) return apiError('forbidden', `Planner ${id} is not yours`);

  const body = await readJson(req);
  if (!body.ok) return apiError('validation_failed', body.message);

  const parsed = parsePlannerPatch(body.data);
  if (!parsed.ok) return apiError('validation_failed', parsed.message);

  const patch = parsed.data;
  const { subjectUnits, ...scalarPatch } = patch;

  const updated = await db.transaction(async (tx) => {
    if (Object.keys(scalarPatch).length > 0) {
      await tx
        .update(planners)
        .set({ ...scalarPatch, updatedAt: sql`now()` })
        .where(eq(planners.id, id));
    } else if (subjectUnits) {
      // subjectUnits만 변경되어도 updated_at은 갱신
      await tx
        .update(planners)
        .set({ updatedAt: sql`now()` })
        .where(eq(planners.id, id));
    }

    if (subjectUnits) {
      await tx.delete(plannerSubjectUnits).where(eq(plannerSubjectUnits.plannerId, id));
      const rows: Array<{
        plannerId: string;
        subject: string;
        unitLabel: string;
        position: number;
      }> = [];
      for (const [subject, units] of Object.entries(subjectUnits)) {
        units.forEach((unitLabel, position) => {
          rows.push({ plannerId: id, subject, unitLabel, position });
        });
      }
      if (rows.length > 0) {
        await tx.insert(plannerSubjectUnits).values(rows);
      }
    }

    const row = await tx.query.planners.findFirst({
      where: eq(planners.id, id),
      with: { subjectUnits: true },
    });
    if (!row) throw new Error('Planner missing after update');
    return row;
  });

  return ok(reshapePlanner(updated));
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  const { id } = await ctx.params;

  const existing = await db.query.planners.findFirst({ where: eq(planners.id, id) });
  if (!existing) return apiError('not_found', `Planner ${id} not found`);
  if (existing.userId !== userId) return apiError('forbidden', `Planner ${id} is not yours`);

  if (existing.active && !existing.archived) {
    return apiError(
      'conflict',
      `Planner ${id} is active. Activate another planner before deleting.`,
    );
  }

  await db.delete(planners).where(eq(planners.id, id));
  return new Response(null, { status: 204 });
}
