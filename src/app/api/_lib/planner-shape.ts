import type { Planner } from '@/lib/db/schema';

export type PlannerSubjectUnitRow = {
  subject: string;
  unitLabel: string;
  position: number;
};

export type PlannerRowWithUnits = Planner & {
  subjectUnits: PlannerSubjectUnitRow[];
};

export function reshapePlanner(row: PlannerRowWithUnits) {
  const subjectUnits: Record<string, string[]> = {};
  for (const u of [...row.subjectUnits].sort((a, b) => a.position - b.position)) {
    (subjectUnits[u.subject] ??= []).push(u.unitLabel);
  }

  return {
    id: row.id,
    name: row.name,
    examType: row.examType,
    examLabel: row.examLabel,
    examStartDate: row.examStartDate,
    examEndDate: row.examEndDate,
    target: {
      kind: row.targetKind,
      value: parseTargetValue(row.targetKind, row.targetValue),
    },
    weekdayHours: { start: row.weekdayStart, end: row.weekdayEnd },
    weekendHours: { start: row.weekendStart, end: row.weekendEnd },
    subjectUnits,
    blockPattern: row.blockPattern,
    weaknessAutoReflect: row.weaknessAutoReflect,
    motivationStyle: row.motivationStyle,
    // mock 도메인 권위 타입 정합 — motto: string (null 아님), customization?: {...} (null 아님).
    // DB nullable → API 응답에서 빈 값/필드 누락으로 정규화. FE 교체 시 round-trip 안전.
    motto: row.motto ?? '',
    active: row.active,
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.customization ? { customization: row.customization } : {}),
  };
}

function parseTargetValue(kind: string, value: string): number | string {
  if (kind === 'free') return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}
