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

  // TOCTOU 가드: 읽기·검증·갱신을 같은 트랜잭션. UPDATE WHERE 절에
  // active=false AND archived=false 가드를 둬 동시 activate/archive 요청과의 race로
  // active=true && archived=true 같은 금지 상태 또는 중복 archive 차단.
  type RowWithUnits = Planner & {
    subjectUnits: Array<{ subject: string; unitLabel: string; position: number }>;
  };
  type Result =
    | { kind: 'not_found' }
    | { kind: 'forbidden' }
    | { kind: 'already_archived' }
    | { kind: 'active' }
    | { kind: 'race' }
    | { kind: 'ok'; row: RowWithUnits };

  const result: Result = await db.transaction<Result>(async (tx) => {
    const existing = await tx.query.planners.findFirst({ where: eq(planners.id, id) });
    if (!existing) return { kind: 'not_found' };
    if (existing.userId !== userId) return { kind: 'forbidden' };
    if (existing.archived) return { kind: 'already_archived' };
    if (existing.active) return { kind: 'active' };

    const archived = await tx
      .update(planners)
      .set({ archived: true, updatedAt: sql`now()` })
      .where(
        and(
          eq(planners.id, id),
          eq(planners.active, false),
          eq(planners.archived, false),
        ),
      )
      .returning({ id: planners.id });
    if (archived.length === 0) return { kind: 'race' };

    const row = await tx.query.planners.findFirst({
      where: eq(planners.id, id),
      with: { subjectUnits: true },
    });
    if (!row) throw new Error('Planner missing after archive');
    return { kind: 'ok', row };
  });

  switch (result.kind) {
    case 'not_found':
      return apiError('not_found', `Planner ${id} not found`);
    case 'forbidden':
      return apiError('forbidden', `Planner ${id} is not yours`);
    case 'already_archived':
      return apiError('conflict', `Planner ${id} is already archived.`);
    case 'active':
      return apiError(
        'conflict',
        `Planner ${id} is active. Activate another planner before archiving.`,
      );
    case 'race':
      return apiError(
        'conflict',
        `Planner ${id} state changed concurrently. Retry shortly.`,
      );
    case 'ok':
      return ok(reshapePlanner(result.row));
  }
}
