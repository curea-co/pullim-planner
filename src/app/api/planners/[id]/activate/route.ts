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

  // TOCTOU 가드: 읽기·검증·갱신을 같은 트랜잭션에서. UPDATE WHERE 절에 archived=false
  // 가드를 둬 동시 archive 요청과의 race로 archived=true 인 planner가 활성화되는 경우 차단.
  type RowWithUnits = Planner & {
    subjectUnits: Array<{ subject: string; unitLabel: string; position: number }>;
  };
  type Result =
    | { kind: 'not_found' }
    | { kind: 'forbidden' }
    | { kind: 'archived' }
    | { kind: 'race' }
    | { kind: 'ok'; row: RowWithUnits };

  let result: Result;
  try {
    result = await db.transaction<Result>(async (tx) => {
      const target = await tx.query.planners.findFirst({ where: eq(planners.id, id) });
      if (!target) return { kind: 'not_found' };
      if (target.userId !== userId) return { kind: 'forbidden' };
      if (target.archived) return { kind: 'archived' };

      // 같은 user의 다른 active planner 모두 비활성화 (partial unique 충돌 방지)
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

      const activated = await tx
        .update(planners)
        .set({ active: true, updatedAt: sql`now()` })
        .where(and(eq(planners.id, id), eq(planners.archived, false)))
        .returning({ id: planners.id });
      if (activated.length === 0) return { kind: 'race' };

      const row = await tx.query.planners.findFirst({
        where: eq(planners.id, id),
        with: { subjectUnits: true },
      });
      if (!row) throw new Error('Planner missing after activate');
      return { kind: 'ok', row };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return apiError(
        'conflict',
        'Another activate operation is in progress. Retry shortly.',
      );
    }
    throw err;
  }

  switch (result.kind) {
    case 'not_found':
      return apiError('not_found', `Planner ${id} not found`);
    case 'forbidden':
      return apiError('forbidden', `Planner ${id} is not yours`);
    case 'archived':
      return apiError('conflict', `Planner ${id} is archived. Unarchive before activating.`);
    case 'race':
      return apiError(
        'conflict',
        `Planner ${id} state changed concurrently (likely archived). Retry shortly.`,
      );
    case 'ok':
      return ok(reshapePlanner(result.row));
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
