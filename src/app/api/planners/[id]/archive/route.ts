import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { planners } from '@/lib/db/schema';
import { getUserId } from '../../../_lib/auth';
import { apiError, ok } from '../../../_lib/response';
import { reshapePlanner } from '../../../_lib/planner-shape';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  const { id } = await ctx.params;

  const existing = await db.query.planners.findFirst({ where: eq(planners.id, id) });
  if (!existing) return apiError('not_found', `Planner ${id} not found`);
  if (existing.userId !== userId) return apiError('forbidden', `Planner ${id} is not yours`);
  if (existing.archived) {
    return apiError('conflict', `Planner ${id} is already archived.`);
  }
  if (existing.active) {
    return apiError(
      'conflict',
      `Planner ${id} is active. Activate another planner before archiving.`,
    );
  }

  const updated = await db.transaction(async (tx) => {
    await tx
      .update(planners)
      .set({ archived: true, updatedAt: sql`now()` })
      .where(eq(planners.id, id));

    const row = await tx.query.planners.findFirst({
      where: eq(planners.id, id),
      with: { subjectUnits: true },
    });
    if (!row) throw new Error('Planner missing after archive');
    return row;
  });

  return ok(reshapePlanner(updated));
}
