import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { planners, plannerSubjectUnits, type Planner } from '@/lib/db/schema';
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

  const body = await readJson(req);
  if (!body.ok) return apiError('validation_failed', body.message);

  const parsed = parsePlannerPatch(body.data);
  if (!parsed.ok) return apiError('validation_failed', parsed.message);

  const patch = parsed.data;

  // 읽기·검증·갱신을 같은 트랜잭션. UPDATE WHERE 절에도 userId/id 가드 둬
  // 동시 delete 후 PATCH가 사라진 row를 다시 조회하다가 500을 던지는 race 차단.
  type RowWithUnits = Planner & {
    subjectUnits: Array<{ subject: string; unitLabel: string; position: number }>;
  };
  type Result =
    | { kind: 'not_found' }
    | { kind: 'forbidden' }
    | { kind: 'validation'; message: string }
    | { kind: 'ok'; row: RowWithUnits };

  const result: Result = await db.transaction<Result>(async (tx) => {
    const existing = await tx.query.planners.findFirst({ where: eq(planners.id, id) });
    if (!existing) return { kind: 'not_found' };
    if (existing.userId !== userId) return { kind: 'forbidden' };

    // customization PATCH partial 머지 — 기존 + 부분 객체. null은 clear.
    let mergedCustomization: typeof existing.customization | undefined;
    let customizationChanged = false;
    if ('customization' in patch) {
      customizationChanged = true;
      if (patch.customization === null) {
        mergedCustomization = null;
      } else {
        const base = existing.customization ?? {};
        const next = { ...base, ...patch.customization } as {
          layoutId?: string;
          paletteId?: string;
          weekLayoutId?: string;
        };
        if (!next.layoutId || !next.paletteId) {
          return {
            kind: 'validation',
            message: 'customization requires layoutId and paletteId after merge',
          };
        }
        mergedCustomization = next as NonNullable<typeof existing.customization>;
      }
    }

    // existing + patch 합친 final state로 create와 동일한 invariants 재검증.
    const mergedStart = patch.examStartDate ?? existing.examStartDate;
    const mergedEnd = patch.examEndDate ?? existing.examEndDate;
    if (mergedEnd < mergedStart) {
      return {
        kind: 'validation',
        message: 'examEndDate must be on or after examStartDate',
      };
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
    if (!invariants.ok) return { kind: 'validation', message: invariants.message };

    const { subjectUnits, customization: _customizationPatch, ...scalarPatch } = patch;
    void _customizationPatch; // raw patch는 위에서 머지 처리

    // Planner row를 항상 touch — scalarPatch가 비어도 updated_at만 갱신.
    // 목적 2가지:
    // (1) 동시 delete race 차단 — UPDATE는 row-lock을 트랜잭션 끝까지 보유 →
    //     subsequent INSERT plannerSubjectUnits 의 FK 위반 race 차단.
    // (2) row가 사라졌으면 .returning() 0건 → not_found 응답.
    const setMap = {
      ...scalarPatch,
      ...(customizationChanged ? { customization: mergedCustomization } : {}),
      updatedAt: sql`now()`,
    };
    const touched = await tx
      .update(planners)
      .set(setMap)
      .where(and(eq(planners.id, id), eq(planners.userId, userId)))
      .returning({ id: planners.id });
    if (touched.length === 0) {
      return { kind: 'not_found' };
    }

    if (subjectUnits) {
      await tx
        .delete(plannerSubjectUnits)
        .where(eq(plannerSubjectUnits.plannerId, id));
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
    if (!row) return { kind: 'not_found' };
    return { kind: 'ok', row };
  });

  switch (result.kind) {
    case 'not_found':
      return apiError('not_found', `Planner ${id} not found`);
    case 'forbidden':
      return apiError('forbidden', `Planner ${id} is not yours`);
    case 'validation':
      return apiError('validation_failed', result.message);
    case 'ok':
      return ok(reshapePlanner(result.row));
  }
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
