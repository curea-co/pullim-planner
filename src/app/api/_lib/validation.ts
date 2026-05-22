/**
 * Mutation 입력 검증 — Phase 3 미니멀리즘 유지 위해 hand-rolled.
 * 외부 라이브러리(zod 등) 도입 시점은 Ph7 FE 교체 완료 후 재고려.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EXAM_TYPES = ['mock', 'suneung', 'midterm', 'final', 'other'] as const;
const TARGET_KINDS = ['grade', 'score', 'free'] as const;
const BLOCK_PATTERNS = ['pomodoro', 'focused', 'deep'] as const;
const MOTIVATION_STYLES = ['autonomous', 'guided', 'spartan'] as const;
// 도메인 권위 enum (mock SubjectKey + tokens LayoutTemplateId/WeekLayoutId/PaletteId 정합)
// 도메인 권위 변경 시 본 표도 동기화.
const SUBJECT_KEYS = ['korean', 'math', 'english', 'science', 'social', 'history'] as const;
const LAYOUT_TEMPLATE_IDS = ['vertical_timeline', 'checklist', 'block_cards', 'pie_list'] as const;
const WEEK_LAYOUT_IDS = ['matrix_by_type', 'school_grid', 'bar_week', 'heatmap'] as const;
const PALETTE_IDS = ['pullim_blue', 'forest', 'sunset', 'pastel', 'mono', 'mint', 'rose'] as const;

// 빌더 examTypeMeta(src/components/planner-builder/builder-types.ts)와 정합 —
// FE 권위 그대로 서버에 복제. 빌더 변경 시 본 표도 갱신.
const EXAM_TYPE_META: Record<
  (typeof EXAM_TYPES)[number],
  { isRange: boolean; targetKind: (typeof TARGET_KINDS)[number] }
> = {
  mock: { isRange: false, targetKind: 'grade' },
  suneung: { isRange: false, targetKind: 'grade' },
  midterm: { isRange: true, targetKind: 'score' },
  final: { isRange: true, targetKind: 'score' },
  other: { isRange: false, targetKind: 'free' },
};

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

// customization은 PATCH에서 3가지 의미를 가짐 — 생략(변경 없음) · null(clear) · 부분 객체(merge).
// raw 옵셔널 패치는 라우트가 기존 row의 customization과 머지하면서 최종 검증.
export type CustomizationPatch = null | {
  layoutId?: (typeof LAYOUT_TEMPLATE_IDS)[number];
  paletteId?: (typeof PALETTE_IDS)[number];
  weekLayoutId?: (typeof WEEK_LAYOUT_IDS)[number];
};

export type PlannerPatchInput = Partial<Omit<PlannerCreateInput, 'customization'>> & {
  customization?: CustomizationPatch;
};

/**
 * Planner 도메인 불변식 — examType↔target.kind, single-day exam, value 범위.
 * 빌더가 강제하는 규칙을 서버에서도 동일 적용.
 * create 시 1회, patch 시 merged final state로 1회 호출.
 */
export function validatePlannerInvariants(state: {
  examType: (typeof EXAM_TYPES)[number];
  examStartDate: string;
  examEndDate: string;
  targetKind: (typeof TARGET_KINDS)[number];
  targetValue: string;
}): ParseResult<true> {
  const meta = EXAM_TYPE_META[state.examType];
  if (state.targetKind !== meta.targetKind) {
    return fail(
      `examType=${state.examType} requires target.kind=${meta.targetKind}, got ${state.targetKind}`,
    );
  }
  if (!meta.isRange && state.examEndDate !== state.examStartDate) {
    return fail(
      `examType=${state.examType} is single-day; examEndDate must equal examStartDate`,
    );
  }
  // 빈/공백 문자열은 Number()가 0으로 변환해버려 score=0이 통과해버리는 문제 차단.
  // 정규식으로 정수 문자열만 허용.
  const parseIntStrict = (s: string): number | null =>
    /^-?\d+$/.test(s) ? Number(s) : null;
  if (state.targetKind === 'grade') {
    const n = parseIntStrict(state.targetValue);
    if (n === null || n < 1 || n > 4) {
      return fail('target.value must be integer 1~4 when target.kind=grade');
    }
  }
  if (state.targetKind === 'score') {
    const n = parseIntStrict(state.targetValue);
    if (n === null || n < 0 || n > 100) {
      return fail('target.value must be integer 0~100 when target.kind=score');
    }
  }
  if (state.targetKind === 'free') {
    if (state.targetValue.trim().length === 0) {
      return fail('target.value must be a non-empty string when target.kind=free');
    }
  }
  return { ok: true, data: true as const };
}

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
  // 빌더 setStart/setEnd가 강제하는 불변식 — 서버도 동일 적용 (YYYY-MM-DD 문자열은 사전순 = 시계열).
  if (examEndDate.data < examStartDate.data) {
    return fail('examEndDate must be on or after examStartDate');
  }

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
  // patch에 두 필드가 함께 오면 순서 검증. 한 필드만 오는 경우는 라우트에서 기존 row 와 합쳐 재검증.
  if (patch.examStartDate && patch.examEndDate && patch.examEndDate < patch.examStartDate) {
    return fail('examEndDate must be on or after examStartDate');
  }
  if ('target' in input) {
    // PATCH는 nested partial 허용 — kind·value 둘 다 옵셔널. value 타입 검증은
    // 라우트가 기존 row 와 머지한 뒤 validatePlannerInvariants에서 수행.
    if (!isObject(input.target)) return fail('target must be { kind?, value? }');
    if ('kind' in input.target) {
      const k = mustEnum(input.target.kind, 'target.kind', TARGET_KINDS);
      if (!k.ok) return k;
      patch.targetKind = k.data;
    }
    if ('value' in input.target) {
      if (typeof input.target.value === 'number') {
        if (!Number.isFinite(input.target.value)) {
          return fail('target.value must be a finite number');
        }
        patch.targetValue = String(input.target.value);
      } else if (typeof input.target.value === 'string') {
        patch.targetValue = input.target.value;
      } else {
        return fail('target.value must be number or string');
      }
    }
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
    // PATCH는 nested partial 허용 — null(clear) 또는 부분 객체(merge).
    // 최종 layoutId+paletteId 필수 검증은 라우트가 기존 row 와 머지한 뒤 수행.
    if (input.customization === null) {
      patch.customization = null;
    } else if (!isObject(input.customization)) {
      return fail('customization must be null or { layoutId?, paletteId?, weekLayoutId? }');
    } else {
      const cust: NonNullable<CustomizationPatch> = {};
      if ('layoutId' in input.customization) {
        const r = mustEnum(input.customization.layoutId, 'customization.layoutId', LAYOUT_TEMPLATE_IDS);
        if (!r.ok) return r;
        cust.layoutId = r.data;
      }
      if ('paletteId' in input.customization) {
        const r = mustEnum(input.customization.paletteId, 'customization.paletteId', PALETTE_IDS);
        if (!r.ok) return r;
        cust.paletteId = r.data;
      }
      if ('weekLayoutId' in input.customization) {
        const r = mustEnum(input.customization.weekLayoutId, 'customization.weekLayoutId', WEEK_LAYOUT_IDS);
        if (!r.ok) return r;
        cust.weekLayoutId = r.data;
      }
      patch.customization = cust;
    }
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
  // 정규식만으로는 2026-02-31 같은 비실존 날짜 통과 → DB 거부 시 500.
  // Date 파싱 후 round-trip 비교로 실제 달력 날짜인지 확인.
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return fail(`${field} is not a valid calendar date: ${v}`);
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
  // 빌더 UI 슬라이더는 max={24} → 종료시각 24:00 허용. start는 0~23, end는 0~24.
  if (
    typeof start !== 'number' ||
    typeof end !== 'number' ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start > 23 ||
    end < 0 ||
    end > 24
  ) {
    return fail(`${field}.start must be 0~23 and ${field}.end must be 0~24`);
  }
  if (start >= end) {
    return fail(`${field}.start must be less than ${field}.end`);
  }
  return { ok: true, data: { start, end } };
}

function mustSubjectUnits(v: unknown): ParseResult<Record<string, string[]>> {
  if (!isObject(v)) return fail('subjectUnits must be Record<SubjectKey, string[]>');
  const out: Record<string, string[]> = {};
  for (const [subject, list] of Object.entries(v)) {
    // mock 도메인 권위 SubjectKey enum 외 키 차단 — UI subjectLabels 매핑 안전 보장.
    if (!(SUBJECT_KEYS as readonly string[]).includes(subject)) {
      return fail(
        `subjectUnits.${subject}: subject must be one of ${SUBJECT_KEYS.join(', ')}`,
      );
    }
    if (!Array.isArray(list)) {
      return fail(`subjectUnits.${subject} must be an array of strings`);
    }
    for (let i = 0; i < list.length; i++) {
      const u = list[i];
      if (typeof u !== 'string' || u.length === 0) {
        return fail(`subjectUnits.${subject}[${i}] must be a non-empty string`);
      }
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
  // tokens 권위 enum 외 값 차단 — getBlockColor/layoutTemplates 등 렌더러 크래시 사전 방지.
  const layoutId = mustEnum(v.layoutId, 'customization.layoutId', LAYOUT_TEMPLATE_IDS);
  if (!layoutId.ok) return layoutId;
  const paletteId = mustEnum(v.paletteId, 'customization.paletteId', PALETTE_IDS);
  if (!paletteId.ok) return paletteId;
  let weekLayoutId: (typeof WEEK_LAYOUT_IDS)[number] | undefined;
  if (v.weekLayoutId !== undefined) {
    const r = mustEnum(v.weekLayoutId, 'customization.weekLayoutId', WEEK_LAYOUT_IDS);
    if (!r.ok) return r;
    weekLayoutId = r.data;
  }
  return {
    ok: true,
    data: {
      layoutId: layoutId.data,
      paletteId: paletteId.data,
      ...(weekLayoutId !== undefined ? { weekLayoutId } : {}),
    },
  };
}
