import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { planners, timeBlocks } from '@/lib/db/schema';
import { getUserId } from '../../../_lib/auth';
import { apiError, ok } from '../../../_lib/response';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type BlockRow = NonNullable<
  Awaited<ReturnType<typeof db.query.timeBlocks.findFirst>>
> & {
  completion: {
    accuracy: number | null;
    emotion: number | null;
  } | null;
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  const { id } = await ctx.params;

  const url = new URL(req.url);
  const date = url.searchParams.get('date');
  if (!date || !DATE_RE.test(date)) {
    return apiError('validation_failed', 'Query param `date` must be YYYY-MM-DD');
  }

  const planner = await db.query.planners.findFirst({
    where: eq(planners.id, id),
  });
  if (!planner) {
    return apiError('not_found', `Planner ${id} not found`);
  }
  if (planner.userId !== userId) {
    return apiError('forbidden', `Planner ${id} is not yours`);
  }

  const rows = await db.query.timeBlocks.findMany({
    where: and(eq(timeBlocks.plannerId, id), eq(timeBlocks.date, date)),
    with: { completion: true },
  });

  return ok(
    [...rows]
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map(reshape),
  );
}

function reshape(row: BlockRow) {
  const completion = row.completion;
  return {
    id: row.id,
    start: row.startTime,
    end: row.endTime,
    subject: row.subject,
    type: row.type,
    title: row.title,
    linkedFeatureSlug: row.linkedFeatureSlug ?? undefined,
    curriculumNodeId: row.curriculumNodeId ?? undefined,
    engines: row.engines,
    progress: row.progress,
    status: row.status,
    expectedMinutes: row.expectedMinutes,
    accuracy: completion?.accuracy ?? undefined,
    emotion: completion?.emotion ?? undefined,
    reasoning: row.reasoning ?? undefined,
  };
}
