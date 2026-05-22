import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { planners, type Planner } from '@/lib/db/schema';
import { getUserId } from '../../../_lib/auth';
import { apiError, ok } from '../../../_lib/response';
import { reshapePlanner } from '../../../_lib/planner-shape';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  const { id } = await ctx.params;

  // TOCTOU 가드: 읽기·검증·갱신을 같은 트랜잭션. UPDATE WHERE archived=true 가드.
  type RowWithUnits = Planner & {
    subjectUnits: Array<{ subject: string; unitLabel: string; position: number }>;
  };
  type Result =
    | { kind: 'not_found' }
    | { kind: 'forbidden' }
    | { kind: 'not_archived' }
    | { kind: 'race' }
    | { kind: 'ok'; row: RowWithUnits };

  const result: Result = await db.transaction<Result>(async (tx) => {
    const existing = await tx.query.planners.findFirst({ where: eq(planners.id, id) });
    if (!existing) return { kind: 'not_found' };
    if (existing.userId !== userId) return { kind: 'forbidden' };
    if (!existing.archived) return { kind: 'not_archived' };

    const unarchived = await tx
      .update(planners)
      .set({ archived: false, updatedAt: sql`now()` })
      .where(
        and(
          eq(planners.id, id),
          eq(planners.userId, userId),
          eq(planners.archived, true),
        ),
      )
      .returning({ id: planners.id });
    if (unarchived.length === 0) return { kind: 'race' };

    const row = await tx.query.planners.findFirst({
      where: eq(planners.id, id),
      with: { subjectUnits: true },
    });
    if (!row) throw new Error('Planner missing after unarchive');
    return { kind: 'ok', row };
  });

  switch (result.kind) {
    case 'not_found':
      return apiError('not_found', `Planner ${id} not found`);
    case 'forbidden':
      return apiError('forbidden', `Planner ${id} is not yours`);
    case 'not_archived':
      return apiError('conflict', `Planner ${id} is not archived.`);
    case 'race':
      return apiError(
        'conflict',
        `Planner ${id} state changed concurrently. Retry shortly.`,
      );
    case 'ok':
      return ok(reshapePlanner(result.row));
  }
}
