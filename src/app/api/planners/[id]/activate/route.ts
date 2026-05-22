import { and, eq, sql } from 'drizzle-orm';
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

  const target = await db.query.planners.findFirst({ where: eq(planners.id, id) });
  if (!target) return apiError('not_found', `Planner ${id} not found`);
  if (target.userId !== userId) return apiError('forbidden', `Planner ${id} is not yours`);
  if (target.archived) {
    return apiError('conflict', `Planner ${id} is archived. Unarchive before activating.`);
  }

  try {
    const updated = await db.transaction(async (tx) => {
      // 같은 user의 다른 active planner 모두 비활성화 (partial unique index 충돌 방지)
      await tx
        .update(planners)
        .set({ active: false, updatedAt: sql`now()` })
        .where(
          and(
            eq(planners.userId, userId),
            eq(planners.active, true),
            eq(planners.archived, false),
          ),
        );

      await tx
        .update(planners)
        .set({ active: true, updatedAt: sql`now()` })
        .where(eq(planners.id, id));

      const row = await tx.query.planners.findFirst({
        where: eq(planners.id, id),
        with: { subjectUnits: true },
      });
      if (!row) throw new Error('Planner missing after activate');
      return row;
    });
    return ok(reshapePlanner(updated));
  } catch (err) {
    if (isUniqueViolation(err)) {
      return apiError(
        'conflict',
        'Another activate operation is in progress. Retry shortly.',
      );
    }
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === '23505'
  );
}
