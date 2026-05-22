import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { planners, plannerSubjectUnits } from '@/lib/db/schema';
import { getUserId } from '../../_lib/auth';
import { apiError, ok } from '../../_lib/response';
import { reshapePlanner } from '../../_lib/planner-shape';
import {
  parsePlannerPatch,
  readJson,
  validatePlannerInvariants,
} from '../../_lib/validation';

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

  // existing + patch를 합친 최종 상태로 create와 동일한 도메인 invariants 재검증.
  // (Codex 지적: 한 필드만 패치돼도 examType↔target.kind, 단일일자 시험의 == 등 교차 불변식이 깨질 수 있음.)
  const mergedStart = patch.examStartDate ?? existing.examStartDate;
  const mergedEnd = patch.examEndDate ?? existing.examEndDate;
  if (mergedEnd < mergedStart) {
    return apiError('validation_failed', 'examEndDate must be on or after examStartDate');
  }
  const invariants = validatePlannerInvariants({
    examType: (patch.examType ?? existing.examType) as Parameters<
      typeof validatePlannerInvariants
    >[0]['examType'],
    examStartDate: mergedStart,
    examEndDate: mergedEnd,
    targetKind: (patch.targetKind ?? existing.targetKind) as Parameters<
      typeof validatePlannerInvariants
    >[0]['targetKind'],
    targetValue: patch.targetValue ?? existing.targetValue,
  });
  if (!invariants.ok) return apiError('validation_failed', invariants.message);

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

  // spec [§3 표] + mock deletePlanner 권위와 정합: active=true 면 삭제 차단
  // (archived 여부 무관). TOCTOU 가드: 읽기·검증·삭제를 같은 트랜잭션, DELETE
  // WHERE 절에도 active=false 가드 둬 동시 activate 후 활성화된 planner 삭제 race 차단.
  type Result =
    | { kind: 'not_found' }
    | { kind: 'forbidden' }
    | { kind: 'active' }
    | { kind: 'race' }
    | { kind: 'ok' };

  const result = await db.transaction<Result>(async (tx) => {
    const existing = await tx.query.planners.findFirst({ where: eq(planners.id, id) });
    if (!existing) return { kind: 'not_found' };
    if (existing.userId !== userId) return { kind: 'forbidden' };
    if (existing.active) return { kind: 'active' };

    const deleted = await tx
      .delete(planners)
      .where(and(eq(planners.id, id), eq(planners.active, false)))
      .returning({ id: planners.id });

    if (deleted.length === 0) return { kind: 'race' };
    return { kind: 'ok' };
  });

  switch (result.kind) {
    case 'not_found':
      return apiError('not_found', `Planner ${id} not found`);
    case 'forbidden':
      return apiError('forbidden', `Planner ${id} is not yours`);
    case 'active':
      return apiError(
        'conflict',
        `Planner ${id} is active. Activate another planner before deleting.`,
      );
    case 'race':
      return apiError(
        'conflict',
        `Planner ${id} state changed concurrently. Retry shortly.`,
      );
    case 'ok':
      return new Response(null, { status: 204 });
  }
}
