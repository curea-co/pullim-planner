import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { planners, type Planner } from '@/lib/db/schema';
import { getUserId } from '../../../_lib/auth';
import { apiError, ok } from '../../../_lib/response';
import { reshapePlanner } from '../../../_lib/planner-shape';

// 대상 planner가 트랜잭션 진행 중 archive/delete된 경우의 race —
// 기존 active 비활성화까지 함께 롤백되도록 throw 로 전파.
class ActivateRaceError extends Error {
  constructor(public plannerId: string) {
    super(`Planner ${plannerId} state changed concurrently during activate`);
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  const { id } = await ctx.params;

  // TOCTOU 가드: 읽기·검증·갱신을 같은 트랜잭션. UPDATE WHERE 절에 archived=false
  // 가드 + race 시 throw로 롤백해 "기존 active만 꺼지고 새 active는 못 켜지는" 상태 차단.
  type RowWithUnits = Planner & {
    subjectUnits: Array<{ subject: string; unitLabel: string; position: number }>;
  };
  type Result =
    | { kind: 'not_found' }
    | { kind: 'forbidden' }
    | { kind: 'archived' }
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
        .where(
          and(
            eq(planners.id, id),
            eq(planners.userId, userId),
            eq(planners.archived, false),
          ),
        )
        .returning({ id: planners.id });
      if (activated.length === 0) {
        // 대상 row가 직전에 archive/delete 됨 → 전체 트랜잭션 롤백.
        throw new ActivateRaceError(id);
      }

      const row = await tx.query.planners.findFirst({
        where: eq(planners.id, id),
        with: { subjectUnits: true },
      });
      if (!row) throw new Error('Planner missing after activate');
      return { kind: 'ok', row };
    });
  } catch (err) {
    if (err instanceof ActivateRaceError) {
      return apiError(
        'conflict',
        `Planner ${err.plannerId} state changed concurrently (likely archived/deleted). Retry shortly.`,
      );
    }
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
    case 'ok':
      return ok(reshapePlanner(result.row));
  }
}

function isUniqueViolation(err: unknown): boolean {
  // drizzle은 pg 에러를 DrizzleQueryError로 wrap — code는 err.cause.code 에 위치할 수 있음.
  if (typeof err !== 'object' || err === null) return false;
  const top = (err as { code?: unknown }).code;
  if (top === '23505') return true;
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause === 'object' && cause !== null) {
    const c = (cause as { code?: unknown }).code;
    if (c === '23505') return true;
  }
  return false;
}
