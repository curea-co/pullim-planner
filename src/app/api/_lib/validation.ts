/**
 * Mutation 입력 검증 — Phase 3 미니멀리즘 유지 위해 hand-rolled.
 * 외부 라이브러리(zod 등) 도입 시점은 Ph7 FE 교체 완료 후 재고려.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EXAM_TYPES = ['mock', 'suneung', 'midterm', 'final', 'other'] as const;
const TARGET_KINDS = ['grade', 'score', 'free'] as const;
const BLOCK_PATTERNS = ['pomodoro', 'focused', 'deep'] as const;
const MOTIVATION_STYLES = ['autonomous', 'guided', 'spartan'] as const;

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type PlannerCreateInput = {
  name: string;
  examType: (typeof EXAM_TYPES)[number];
  examLabel: string;
  examStartDate: string;
  examEndDate: string;
  targetKind: (typeof TARGET_KINDS)[number];
  targetValue: string;
  weekdayStart: number;
  weekdayEnd: number;
  weekendStart: number;
  weekendEnd: number;
  subjectUnits: Record<string, string[]>;
  blockPattern: (typeof BLOCK_PATTERNS)[number];
  weaknessAutoReflect: boolean;
  motivationStyle: (typeof MOTIVATION_STYLES)[number];
  motto: string | null;
  customization: {
    layoutId: string;
    weekLayoutId?: string;
    paletteId: string;
  } | null;
};

export type PlannerPatchInput = Partial<PlannerCreateInput>;

export async function readJson(req: Request): Promise<ParseResult<unknown>> {
  try {
    const body = await req.json();
    return { ok: true, data: body };
  } catch {
    return { ok: false, message: 'Request body must be valid JSON' };
  }
}

export function parsePlannerCreate(input: unknown): ParseResult<PlannerCreateInput> {
  if (!isObject(input)) return fail('Request body must be an object');

  const name = mustStr(input.name, 'name');
  if (!name.ok) return name;
  const examType = mustEnum(input.examType, 'examType', EXAM_TYPES);
  if (!examType.ok) return examType;
  const examLabel = mustStr(input.examLabel, 'examLabel');
  if (!examLabel.ok) return examLabel;
  const examStartDate = mustDate(input.examStartDate, 'examStartDate');
  if (!examStartDate.ok) return examStartDate;
  const examEndDate = mustDate(input.examEndDate, 'examEndDate');
  if (!examEndDate.ok) return examEndDate;

  if (!isObject(input.target)) return fail('target must be { kind, value }');
  const targetKind = mustEnum(input.target.kind, 'target.kind', TARGET_KINDS);
  if (!targetKind.ok) return targetKind;
  const targetValue = mustTargetValue(input.target.value, targetKind.data);
  if (!targetValue.ok) return targetValue;

  const weekday = mustHourRange(input.weekdayHours, 'weekdayHours');
  if (!weekday.ok) return weekday;
  const weekend = mustHourRange(input.weekendHours, 'weekendHours');
  if (!weekend.ok) return weekend;

  const subjectUnits = mustSubjectUnits(input.subjectUnits);
  if (!subjectUnits.ok) return subjectUnits;

  const blockPattern = mustEnum(input.blockPattern, 'blockPattern', BLOCK_PATTERNS);
  if (!blockPattern.ok) return blockPattern;
  const weaknessAutoReflect = mustBool(input.weaknessAutoReflect, 'weaknessAutoReflect');
  if (!weaknessAutoReflect.ok) return weaknessAutoReflect;
  const motivationStyle = mustEnum(input.motivationStyle, 'motivationStyle', MOTIVATION_STYLES);
  if (!motivationStyle.ok) return motivationStyle;

  const motto = mustOptString(input.motto, 'motto');
  if (!motto.ok) return motto;
  const customization = mustOptCustomization(input.customization);
  if (!customization.ok) return customization;

  return {
    ok: true,
    data: {
      name: name.data,
      examType: examType.data,
      examLabel: examLabel.data,
      examStartDate: examStartDate.data,
      examEndDate: examEndDate.data,
      targetKind: targetKind.data,
      targetValue: targetValue.data,
      weekdayStart: weekday.data.start,
      weekdayEnd: weekday.data.end,
      weekendStart: weekend.data.start,
      weekendEnd: weekend.data.end,
      subjectUnits: subjectUnits.data,
      blockPattern: blockPattern.data,
      weaknessAutoReflect: weaknessAutoReflect.data,
      motivationStyle: motivationStyle.data,
      motto: motto.data,
      customization: customization.data,
    },
  };
}

export function parsePlannerPatch(input: unknown): ParseResult<PlannerPatchInput> {
  if (!isObject(input)) return fail('Request body must be an object');
  if ('active' in input || 'archived' in input) {
    return fail('Use /activate · /archive · /unarchive endpoints for state changes');
  }

  const patch: PlannerPatchInput = {};

  if ('name' in input) {
    const r = mustStr(input.name, 'name');
    if (!r.ok) return r;
    patch.name = r.data;
  }
  if ('examType' in input) {
    const r = mustEnum(input.examType, 'examType', EXAM_TYPES);
    if (!r.ok) return r;
    patch.examType = r.data;
  }
  if ('examLabel' in input) {
    const r = mustStr(input.examLabel, 'examLabel');
    if (!r.ok) return r;
    patch.examLabel = r.data;
  }
  if ('examStartDate' in input) {
    const r = mustDate(input.examStartDate, 'examStartDate');
    if (!r.ok) return r;
    patch.examStartDate = r.data;
  }
  if ('examEndDate' in input) {
    const r = mustDate(input.examEndDate, 'examEndDate');
    if (!r.ok) return r;
    patch.examEndDate = r.data;
  }
  if ('target' in input) {
    if (!isObject(input.target)) return fail('target must be { kind, value }');
    const k = mustEnum(input.target.kind, 'target.kind', TARGET_KINDS);
    if (!k.ok) return k;
    const v = mustTargetValue(input.target.value, k.data);
    if (!v.ok) return v;
    patch.targetKind = k.data;
    patch.targetValue = v.data;
  }
  if ('weekdayHours' in input) {
    const r = mustHourRange(input.weekdayHours, 'weekdayHours');
    if (!r.ok) return r;
    patch.weekdayStart = r.data.start;
    patch.weekdayEnd = r.data.end;
  }
  if ('weekendHours' in input) {
    const r = mustHourRange(input.weekendHours, 'weekendHours');
    if (!r.ok) return r;
    patch.weekendStart = r.data.start;
    patch.weekendEnd = r.data.end;
  }
  if ('subjectUnits' in input) {
    const r = mustSubjectUnits(input.subjectUnits);
    if (!r.ok) return r;
    patch.subjectUnits = r.data;
  }
  if ('blockPattern' in input) {
    const r = mustEnum(input.blockPattern, 'blockPattern', BLOCK_PATTERNS);
    if (!r.ok) return r;
    patch.blockPattern = r.data;
  }
  if ('weaknessAutoReflect' in input) {
    const r = mustBool(input.weaknessAutoReflect, 'weaknessAutoReflect');
    if (!r.ok) return r;
    patch.weaknessAutoReflect = r.data;
  }
  if ('motivationStyle' in input) {
    const r = mustEnum(input.motivationStyle, 'motivationStyle', MOTIVATION_STYLES);
    if (!r.ok) return r;
    patch.motivationStyle = r.data;
  }
  if ('motto' in input) {
    const r = mustOptString(input.motto, 'motto');
    if (!r.ok) return r;
    patch.motto = r.data;
  }
  if ('customization' in input) {
    const r = mustOptCustomization(input.customization);
    if (!r.ok) return r;
    patch.customization = r.data;
  }

  return { ok: true, data: patch };
}

/* ─── primitives ──────────────────────────────────────────────────────── */

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail<T>(message: string): ParseResult<T> {
  return { ok: false, message };
}

function mustStr(v: unknown, field: string): ParseResult<string> {
  if (typeof v !== 'string' || v.length === 0) return fail(`${field} must be a non-empty string`);
  return { ok: true, data: v };
}

function mustOptString(v: unknown, field: string): ParseResult<string | null> {
  if (v === null || v === undefined) return { ok: true, data: null };
  if (typeof v !== 'string') return fail(`${field} must be a string or null`);
  return { ok: true, data: v };
}

function mustBool(v: unknown, field: string): ParseResult<boolean> {
  if (typeof v !== 'boolean') return fail(`${field} must be a boolean`);
  return { ok: true, data: v };
}

function mustDate(v: unknown, field: string): ParseResult<string> {
  if (typeof v !== 'string' || !DATE_RE.test(v)) {
    return fail(`${field} must be YYYY-MM-DD`);
  }
  return { ok: true, data: v };
}

function mustEnum<T extends string>(
  v: unknown,
  field: string,
  allowed: readonly T[],
): ParseResult<T> {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    return fail(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return { ok: true, data: v as T };
}

function mustTargetValue(
  v: unknown,
  kind: (typeof TARGET_KINDS)[number],
): ParseResult<string> {
  if (kind === 'free') {
    if (typeof v !== 'string') return fail('target.value must be a string when kind=free');
    return { ok: true, data: v };
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return fail(`target.value must be a number when kind=${kind}`);
  }
  return { ok: true, data: String(v) };
}

function mustHourRange(
  v: unknown,
  field: string,
): ParseResult<{ start: number; end: number }> {
  if (!isObject(v)) return fail(`${field} must be { start, end }`);
  const start = v.start;
  const end = v.end;
  if (
    typeof start !== 'number' ||
    typeof end !== 'number' ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start > 23 ||
    end < 0 ||
    end > 23
  ) {
    return fail(`${field}.start/end must be integers 0~23`);
  }
  return { ok: true, data: { start, end } };
}

function mustSubjectUnits(v: unknown): ParseResult<Record<string, string[]>> {
  if (!isObject(v)) return fail('subjectUnits must be Record<subject, string[]>');
  const out: Record<string, string[]> = {};
  for (const [subject, list] of Object.entries(v)) {
    if (!Array.isArray(list) || !list.every((u) => typeof u === 'string')) {
      return fail(`subjectUnits.${subject} must be an array of strings`);
    }
    out[subject] = list as string[];
  }
  return { ok: true, data: out };
}

function mustOptCustomization(
  v: unknown,
): ParseResult<PlannerCreateInput['customization']> {
  if (v === null || v === undefined) return { ok: true, data: null };
  if (!isObject(v)) return fail('customization must be { layoutId, paletteId, weekLayoutId? } or null');
  const layoutId = v.layoutId;
  const paletteId = v.paletteId;
  const weekLayoutId = v.weekLayoutId;
  if (typeof layoutId !== 'string' || typeof paletteId !== 'string') {
    return fail('customization.layoutId / paletteId must be strings');
  }
  if (weekLayoutId !== undefined && typeof weekLayoutId !== 'string') {
    return fail('customization.weekLayoutId must be a string when present');
  }
  return {
    ok: true,
    data: {
      layoutId,
      paletteId,
      ...(weekLayoutId !== undefined ? { weekLayoutId } : {}),
    },
  };
}
