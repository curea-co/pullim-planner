import {
  Target, Clock, BookOpen, Sparkles,
  Timer, Waves,
  type LucideIcon,
} from 'lucide-react';
import { subjectLabels, type SubjectKey } from '@/lib/mock';
import { WEAKNESS_ENABLED } from '@/lib/flags';
import { examPresets, presetNameForDate } from '@/lib/planner/exam-presets';
import { canDeriveScope, inferElectives, subjectScope } from '@/lib/planner/exam-scope';

/**
 * 학생 플래너 빌더 폼 데이터.
 * 핸드오프 08 기반.
 *
 * 위저드는 **입력 3단계 + 확인 1단계**만 묻는다. 나머지 항목은 여기 기본값으로 채워
 * 보내고, 학생이 원하면 1단계 '시험명·다짐 직접 쓰기'에서 되돌려 받는다.
 * 타입·저장 페이로드는 그대로다.
 */

export type BlockPattern = 'pomodoro' | 'focused' | 'deep';
export type MotivationStyle = 'autonomous' | 'guided' | 'spartan';

/**
 * 시험 종류 — 단일일자(mock/suneung/other)와 범위(midterm/final).
 * 중간/기말고사는 보통 3~5일 동안 진행되어 시작일과 종료일이 모두 의미 있음.
 */
export type ExamType = 'mock' | 'suneung' | 'midterm' | 'final' | 'other';

export type TargetKind = 'grade' | 'score' | 'free';

/**
 * 오늘(KST, YYYY-MM-DD) — 시험 날짜 하한. 계획표는 미래를 향하므로 과거 시험일은 허용하지 않는다.
 * step1 date input `min`과 goNext/activate 검증이 같은 값을 쓴다.
 */
export function todayIsoKst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const examTypeMeta: Record<ExamType, { label: string; isRange: boolean; targetKind: TargetKind; hint: string }> = {
  mock:    { label: '모의고사',  isRange: false, targetKind: 'grade', hint: 'D-day 14일 이내면 빈출 단원 +30% 자동 가중' },
  suneung: { label: '수능',      isRange: false, targetKind: 'grade', hint: '수능 D-day 기반 장기 곡선 — 6/9월 모평으로 단계별 점검' },
  midterm: { label: '중간고사',  isRange: true,  targetKind: 'score', hint: '시험 첫날 D-day 기준 + 마지막 날까지 학습 일정 압축' },
  final:   { label: '기말고사',  isRange: true,  targetKind: 'score', hint: '시험 첫날 D-day 기준 + 마지막 날까지 학습 일정 압축' },
  other:   { label: '기타',      isRange: false, targetKind: 'free',  hint: '특별 일정·자체 목표 — 자유 설정' },
};

export type PlannerForm = {
  // Step 1 — 목표
  examType: ExamType;
  examName: string;
  examStartDate: string;       // YYYY-MM-DD — 단일일자 시 이 필드만 사용
  examEndDate: string;         // YYYY-MM-DD — 범위 시험에서만 의미. 단일이면 start와 동일.
  targetGrade: string;         // 모의·수능 — 숫자 한 자리(1~8, QA #5). UI가 '등급' 서픽스 표기
  targetScore: number;         // 중간·기말 (0–100)
  targetGoal: string;          // 기타 (자유 텍스트)
  motto: string;
  // Step 2 — 가용 시간 (0–23h)
  weekdayHours: { start: number; end: number };
  weekendHours: { start: number; end: number };
  // Step 3 — 학습 범위 (과목·단원 선택). 시간 분배는 시스템이 자동 계산.
  subjectUnits: Partial<Record<SubjectKey, string[]>>;
  /** @deprecated 시간 분배 % 모델 폐기 — 호환성 위해 type에만 남김 */
  subjectWeights?: Partial<Record<SubjectKey, number>>;
  // Step 4 — 블록 패턴
  blockPattern: BlockPattern;
  /** @deprecated 의미 모호로 v2에서 제거 — 패턴 카드 자체가 휴식 비율 정의 */
  breakRatio?: number;
  // Step 5 — 루틴(반복 행동) 적용 — 라이브러리에서 고른 루틴 id (선택)
  routineIds: string[];
  // Step 6 — 약점 자동 반영 (가중치 fine-tune은 AI에 위임)
  weaknessAutoReflect: boolean;
  /** @deprecated 의미 모호로 v2에서 제거 */
  weaknessWeight?: number;
  /**
   * 동기 스타일 — **화면에서 고를 수 없다**(선택 UI 제거, 2026-08-24). BE 계약(`motivationStyle`
   * 필수)이라 필드는 유지하고 기본값을 그대로 실어 보낸다. 다시 묻게 되면 여기부터 살린다.
   */
  motivationStyle: MotivationStyle;
  // Step 8 — 리마인더
  remindKakao: boolean;
  remindPush: boolean;
  remindBefore5min: boolean;
  parentDailyReport: boolean;
};

export const initialPlannerForm: PlannerForm = {
  examType: 'mock',
  examName: '',
  examStartDate: '',
  examEndDate: '',
  targetGrade: '',
  targetScore: 90,
  targetGoal: '',
  motto: '',
  weekdayHours: { start: 18, end: 23 },
  weekendHours: { start: 10, end: 22 },
  subjectUnits: {},
  blockPattern: 'focused',
  routineIds: [],
  weaknessAutoReflect: false, // 기본 체크 해제(사용자 확정 2026-07-05) — 켜는 건 본인 선택
  motivationStyle: 'guided',
  remindKakao: false, // 카카오 알림 발송 미연동 — UI 숨김 상태와 정합(dev QA #5). 실 연동 시 복원.
  remindPush: true,
  remindBefore5min: true,
  parentDailyReport: false,
};

/** 카드 보조 설명은 뺐다 — 라벨과 spec(집중/휴식 분)만으로 고른다. */
export const blockPatternMeta: Record<BlockPattern, { label: string; Icon: LucideIcon; spec: string }> = {
  pomodoro: { label: '포모도로',   Icon: Timer,  spec: '25분 집중 / 5분 휴식 · 4사이클 후 긴 휴식' },
  focused:  { label: '집중',       Icon: Target, spec: '50분 집중 / 10분 휴식' },
  deep:     { label: '딥워크',     Icon: Waves,  spec: '90분 집중 / 15분 휴식' },
};

/* 동기 스타일 표시 메타(`motivationStyleMeta`)는 제거했다 — 학생이 고를 수 있는 화면이
 * 어디에도 없는데 요약에만 값이 뜨던 상태였다(오너 지적 2026-08-24). `PlannerForm.motivationStyle`
 * 자체는 BE 계약이라 그대로 두고 기본값('guided')으로 계속 전송한다. */

export type StepKey = 'goal' | 'hours' | 'subjects' | 'activate';

export type StepInfo = {
  num: number;
  key: StepKey;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

/* ─── Planner ↔ PlannerForm 어댑터 (Plan 3 — 수정 모드 빌더) ────────── */

import type { Planner } from '@/lib/mock';

/** 기존 Planner를 빌더 폼 초기값으로 변환 — 수정 모드 빌더 진입 시 사용 */
export function plannerToForm(p: Planner): PlannerForm {
  return {
    examType: p.examType,
    examName: p.examLabel || p.name,
    examStartDate: p.examStartDate,
    examEndDate: p.examEndDate,
    // 숫자만 — '등급' 서픽스는 UI 표기(QA #5 숫자 전용 입력과 정합)
    targetGrade: p.target.kind === 'grade' ? String(p.target.value) : '',
    targetScore: p.target.kind === 'score' ? Number(p.target.value) : 90,
    targetGoal: p.target.kind === 'free' ? String(p.target.value) : '',
    motto: p.motto,
    weekdayHours: { ...p.weekdayHours },
    weekendHours: { ...p.weekendHours },
    subjectUnits: { ...p.subjectUnits },
    blockPattern: p.blockPattern,
    // 적용 루틴 프리필 — BE appliedRoutineIds(블록 역산). 미제공(mock 등)이면 빈 선택.
    routineIds: p.appliedRoutineIds ?? [],
    // 게이트 off 땐 기존 true 값도 false 로 — 출시 예정 상태에서 재저장 시 켜진 채 남지 않게
    weaknessAutoReflect: WEAKNESS_ENABLED ? p.weaknessAutoReflect : false,
    motivationStyle: p.motivationStyle,
    // 알림 설정은 Planner 메타에 미보존 — 기본값 사용 (별도 사용자 설정으로 분리 예정)
    remindKakao: false, // 카카오 알림 발송 미연동 — UI 숨김 상태와 정합(dev QA #5). 실 연동 시 복원.
    remindPush: true,
    remindBefore5min: true,
    parentDailyReport: false,
  };
}

/** 빌더 폼 → Planner 패치 — 수정 저장·신규 생성에 사용 */
export function formToPlannerPatch(form: PlannerForm): Omit<Planner, 'id' | 'active' | 'archived' | 'createdAt' | 'updatedAt'> {
  const kind = examTypeMeta[form.examType ?? 'mock'].targetKind;
  const target =
    kind === 'grade' ? { kind: 'grade' as const, value: parseInt(form.targetGrade, 10) || 1 }
    : kind === 'score' ? { kind: 'score' as const, value: form.targetScore }
    : { kind: 'free' as const, value: form.targetGoal };

  // 시험명은 최소 경로에서 묻지 않는다 — 비어 있으면 시험 종류·날짜에서 파생한 이름으로 채운다.
  const name = resolvedExamName(form);

  return {
    name,
    examType: form.examType,
    examLabel: name,
    examStartDate: form.examStartDate,
    examEndDate: form.examEndDate || form.examStartDate,
    target,
    weekdayHours: { ...form.weekdayHours },
    weekendHours: { ...form.weekendHours },
    subjectUnits: { ...form.subjectUnits },
    blockPattern: form.blockPattern,
    weaknessAutoReflect: form.weaknessAutoReflect,
    motivationStyle: form.motivationStyle,
    motto: form.motto,
  };
}

/**
 * 최소 경로 — 학생만 아는 값 3개를 묻고, 결과를 한 번 확인시킨다.
 *
 * 시험일(외부 일정) · 하루에 쓸 수 있는 시간(본인 사정) · 시험 범위(학교 진도)는 시스템이
 * 알아낼 방법이 없다. 그 밖의 항목(시험명·다짐·알림)은 시간표 배치를 바꾸지 않으므로
 * 기본값으로 채워 보내고 1단계 '시험명·다짐 직접 쓰기'에서만 노출한다.
 *
 * 블록 패턴·루틴·약점은 4단계 인라인 조정으로 내렸다 — 결과를 보고 고치는 편이 빠르다.
 */
const allSteps: readonly Omit<StepInfo, 'num'>[] = [
  { key: 'goal',     label: '목표', icon: Target,   title: '무엇을 향해 달릴까?',
    description: '시험이 있으면 그 날짜에 맞춰 짜요. 시험명은 자동으로 붙여 둡니다.' },
  { key: 'hours',    label: '하루', icon: Clock,    title: '하루에 얼마나 쓸 수 있어?',
    description: '이건 AI가 대신 정할 수 없어요. 학원·자습 일정은 본인만 아니까요. 여기서 정한 시간 안에서만 블록을 배치합니다.' },
  { key: 'subjects', label: '범위', icon: BookOpen, title: '뭘 공부해?',
    description: '과목을 고르면 단원은 채워 드려요. 선택과목과 진도는 시스템이 알 수 없어서 물어봅니다 — 그 둘을 모르면 채워 넣은 범위가 통째로 틀립니다.' },
  { key: 'activate', label: '확인', icon: Sparkles, title: '이렇게 짰어요',
    description: '다음 7일 미리보기예요. 마음에 안 드는 건 아래에서 바로 바꿀 수 있어요.' },
];

export const plannerStepConfig: readonly StepInfo[] = allSteps.map((s, i) => ({ ...s, num: i + 1 }));

/* ─── 자동 시험명 ──────────────────────────────────────────────────
 * 시험명은 최소 경로에서 뺐다 — 시험 종류와 날짜를 알면 이름은 파생값이다.
 * '직접 설정'에서 학생이 직접 쓴 이름은 이후 자동 갱신에서 건드리지 않는다.
 */

/** 시험 종류·날짜에서 파생한 이름 */
export function autoExamName(form: PlannerForm): string {
  const type = form.examType ?? 'mock';
  const date = form.examStartDate ?? '';
  if (type === 'other') return form.targetGoal?.trim() || '자유 목표';
  if (!date) return examTypeMeta[type].label;

  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  if (type === 'suneung') return presetNameForDate('suneung', date) ?? `${year + 1}학년도 수능`;
  if (type === 'mock') return presetNameForDate('mock', date) ?? `${year} ${month}월 모의고사`;
  const term = month <= 7 ? '1학기' : '2학기';
  return `${year} ${term} ${examTypeMeta[type].label}`;
}

/**
 * 시험 종류·날짜를 바꿀 때 이름을 함께 갱신한다.
 * 직전 이름이 그 시점의 자동 이름과 같았을 때(= 학생이 손대지 않았을 때)만 새 이름으로 바꾼다.
 */
export function withAutoExamName(prev: PlannerForm, next: PlannerForm): PlannerForm {
  const untouched = !prev.examName?.trim() || prev.examName === autoExamName(prev);
  return untouched ? { ...next, examName: autoExamName(next) } : next;
}

/** 저장·표시에 쓸 시험명 — 비어 있으면 자동 이름으로 채운다 */
export function resolvedExamName(form: PlannerForm): string {
  return form.examName?.trim() || autoExamName(form);
}

/**
 * 최소 경로에서 뺀 항목(시험명·다짐)에 학생이 넣은 값이 있는가.
 * 수정 모드에서 1단계 '시험명·다짐 직접 쓰기'를 처음부터 펼쳐 둘지 판단한다 —
 * 만들 때 쓴 값이 접힌 채로 숨어 있으면 "고칠 땐 안 보이는" 상태가 된다.
 *
 * 목표(등급·점수·자유)는 **최소 경로에 있으므로 여기서 보지 않는다.** 저장된 플래너는
 * 전부 목표를 갖고 있어서(BE 필수), 목표를 근거로 삼으면 수정 진입이 항상 펼친 상태가 된다.
 *
 * 동기 스타일도 보지 않는다 — 고를 수 있는 화면이 없어졌으므로 저장된 값이 기본값과
 * 달라도 그건 **학생이 넣은 값이 아니다**(옛 버전·BE 기본값). 펼쳐 둘 근거가 될 수 없다.
 */
export function hasCustomBasics(form: PlannerForm): boolean {
  if (form.motto?.trim()) return true;
  return !!(form.examName?.trim() && form.examName !== autoExamName(form));
}

/* ─── 학습 범위 확인 게이트 ────────────────────────────────────────
 * 범위는 시스템이 채우되, **학생이 확인하기 전에는 다음으로 넘어가지 못한다.**
 * 미리 채운 값은 확인 없이 그냥 통과되기 때문이다. 게이트 상태는 폼이 아니라 위저드
 * 진행 상태라서 PlannerForm 에 넣지 않는다(저장 페이로드 불변).
 */

/** 학교 진도에 대한 답 */
export type ScopeAnswer = 'all' | 'progress' | 'custom';

export type ScopeState = {
  /** 아직 답하지 않았으면 null */
  answer: ScopeAnswer | null;
  /** 과목별로 고른 선택과목 */
  electives: Partial<Record<SubjectKey, string[]>>;
  /** 과목별 '마지막으로 배운 단원' — progress 답변의 증명 */
  progressCut: Partial<Record<SubjectKey, string>>;
  /**
   * **지금 답 아래에서** 범위가 확정된 과목 — 수정 모드 프리필이 여기 들어온다.
   * 게이트 답을 바꾸면 이전 답을 전제로 선 확정이라 전부 무효가 된다.
   */
  settled: SubjectKey[];
  /**
   * **자동 범위로 되돌릴 수 없는 과목** — 답과 무관하게 단원이 유지된다. 두 경로로 들어온다:
   *  - 학생이 [단원 직접 편집]으로 손수 적어 넣은 과목
   *  - 수정 모드 프리필 중 시스템이 재구성할 수 없는 과목(`canDeriveScope` false)
   *
   * `settled` 와 나눠 두는 이유: 수정 모드는 저장된 과목을 전부 `settled` 로 넣는데,
   * 직접 편집까지 같은 배열에 담아 답 변경 시 통째로 보존하면 수정 모드에서 게이트가
   * 죽은 컨트롤이 된다(어떤 답을 골라도 범위가 그대로). 반대로 통째로 비우면 학생이
   * 방금 적은 단원을 자동 범위가 덮어쓴다(Codex). 두 의미를 분리해야 둘 다 지켜진다.
   */
  manualUnits: SubjectKey[];
};

/**
 * 초기 게이트 상태. 이미 범위가 있는 폼(= 수정 모드)은 확정된 것으로 본다 —
 * 만들 때 답한 걸 고칠 때 다시 묻지 않는다. 새로 만들 때는 아무것도 답하지 않은 상태.
 *
 * 프리필은 원칙적으로 `manualUnits` 에 넣지 않는다 — 이번 세션에서 직접 편집한 게 아니므로,
 * 답을 바꾸면 새 답 기준으로 다시 파생돼야 한다.
 *
 * **예외 — 자동 범위로 되돌릴 수 없는 과목**(`canDeriveScope` false). 선택과목을 역추론할 수
 * 없는 자유 입력 범위(`math: ['학원 교재 3단원']`)를 파생에 맡기면, 답을 바꾸는 순간
 * `needsElective` 가 서서 단원이 `[]` 로 덮어써지고 선택과목부터 다시 고르게 된다 —
 * 학생이 저장해 둔 범위를 확인 한 번에 잃는다(Codex). 되돌릴 수 없는 건 유지가 유일한 답이고,
 * 자동 범위로 가는 출구는 과목 칩 껐다 켜기(`toggleSubject`)로 남아 있다.
 */
export function initialScopeState(form: PlannerForm): ScopeState {
  const units = form.subjectUnits ?? {};
  const subjects = Object.keys(units) as SubjectKey[];
  if (subjects.length === 0) {
    return { answer: null, electives: {}, progressCut: {}, settled: [], manualUnits: [] };
  }
  const electives: Partial<Record<SubjectKey, string[]>> = {};
  for (const s of subjects) electives[s] = inferElectives(s, units[s] ?? []);
  return {
    answer: 'custom',
    electives,
    progressCut: {},
    settled: subjects,
    manualUnits: subjects.filter(s => !canDeriveScope(s, units[s] ?? [])),
  };
}

/**
 * 그 과목의 범위를 학생이 이미 확인했는가 — 지금 답 아래의 선 확정(`settled`)이거나
 * 자동 범위로 되돌릴 수 없는 확정(`manualUnits`).
 * 두 경우 모두 시스템이 단원을 다시 파생해 덮어써서는 안 되고, 게이트 증명도 이미 선 것으로 본다.
 */
export function isScopeConfirmed(subject: SubjectKey, scope: ScopeState): boolean {
  return scope.settled.includes(subject) || scope.manualUnits.includes(subject);
}

/** 선택과목을 아직 고르지 않아 범위를 확정할 수 없는 과목인가 */
export function needsElective(subject: SubjectKey, scope: ScopeState): boolean {
  // 직접 편집한 과목까지 다시 물으면 교육과정에 없는 선택과목의 우회로
  // ([목록에 없어 · 직접 고를래] → 직접 편집)가 답 변경 한 번에 막다른 길로 돌아간다.
  if (isScopeConfirmed(subject, scope)) return false;
  const spec = subjectScope(subject);
  return spec.choose > 0 && (scope.electives[subject]?.length ?? 0) < spec.choose;
}

/**
 * 목표 등급 허용 범위 — 입력 UI(`TargetField` 의 grade 분기)가
 * `e.target.value.replace(/[^1-8]/g, '').slice(0, 1)` 로 한 자리 1~8 만 남긴다(QA #5).
 * 순수 함수 쪽 검증도 같은 범위를 써야 UI 와 판정이 어긋나지 않는다.
 */
const GRADE_MIN = 1;
const GRADE_MAX = 8;

/** 목표 점수 허용 범위 — 입력 UI 가 `min=0 max=100` + '100점 만점' 표기로 잘라 넣는 값 */
const SCORE_MIN = 0;
const SCORE_MAX = 100;

/** 1단계를 통과하지 못하는 이유 — 없으면 null */
export function goalBlocker(form: PlannerForm): string | null {
  // 목표는 시간표 배치를 바꾸지 않지만 BE `target` 이 필수라 **묻지 않으면 학생이 정하지
  // 않은 값이 저장된다.** 빈 등급이 `parseInt('') || 1` 로 1등급이 됐고, 자유 목표는
  // 비빈 문자열 필수라 저장 자체가 400 이었다(Codex).
  //
  // 값의 **범위**까지 여기서 본다. 입력 UI 는 범위 밖 타이핑을 막지만 수정 모드 프리필
  // (`plannerToForm`)은 저장된 값을 그대로 되살리고, BE `planner-write.dto.ts` 는
  // grade/score 를 '유한 number' 로만 검증한다 — 레거시/오염 데이터의 9 등급 같은 값이
  // 1단계를 통과하면 `formToPlannerPatch` 가 그 값을 그대로 다시 전송한다(Codex).
  const targetKind = examTypeMeta[form.examType ?? 'mock'].targetKind;
  if (targetKind === 'free' && !form.targetGoal?.trim()) {
    return '무엇을 목표로 할지 적어주세요';
  }
  if (targetKind === 'grade') {
    const raw = form.targetGrade?.trim();
    // '비어 있음'과 '범위 밖'은 학생이 할 일이 다르다 — 적어야 하는지, 고쳐야 하는지.
    if (!raw) return '목표 등급을 정해주세요';
    const grade = Number(raw);
    if (!Number.isInteger(grade) || grade < GRADE_MIN || grade > GRADE_MAX) {
      return `목표 등급은 ${GRADE_MIN}~${GRADE_MAX} 중에서 정해주세요`;
    }
  }
  if (targetKind === 'score') {
    // 점수는 화면에 기본값이 보이므로 '비어 있음'은 묻지 않는다(폴백도 화면과 같은 값).
    // 다만 범위 밖 프리필은 막는다 — 그대로 저장하면 BE 검증(유한 number)은 통과하지만
    // 100점 만점 UI 와 어긋난 값이 남고, `Number(...)` 가 NaN 이면 저장이 400 으로 튄다.
    const score = form.targetScore ?? initialPlannerForm.targetScore;
    if (!Number.isFinite(score) || score < SCORE_MIN || score > SCORE_MAX) {
      return `목표 점수는 ${SCORE_MIN}~${SCORE_MAX} 사이로 정해주세요`;
    }
  }
  if (!form.examStartDate) return '시험 날짜를 정해주세요';
  // 계획표는 미래 대상 — 이미 **종료된** 시험 차단. 판정은 종료일 기준(진행 중 범위 시험은
  // 기존 시작일 그대로 저장 가능해야 한다). 단일 시험은 종료일=시작일이라 동작 동일.
  if ((form.examEndDate || form.examStartDate) < todayIsoKst()) {
    return '이미 지난 시험이에요 — 시험 날짜를 오늘 이후로 선택해주세요';
  }
  return null;
}

/** 3단계를 통과하지 못하는 이유 — 없으면 null */
export function scopeBlocker(form: PlannerForm, scope: ScopeState): string | null {
  const units = form.subjectUnits ?? {};
  const subjects = Object.keys(units) as SubjectKey[];
  if (subjects.length === 0) return '과목을 하나 이상 골라주세요 — 단원은 자동으로 채워집니다';

  const pendingChoice = subjects.find(s => needsElective(s, scope));
  if (pendingChoice) return `${subjectLabels[pendingChoice] ?? pendingChoice} 선택과목을 골라주세요`;

  if (!scope.answer) return '학교 진도를 골라주세요';
  if (scope.answer === 'progress') {
    const noCut = subjects.find(s => !isScopeConfirmed(s, scope) && !scope.progressCut[s]);
    if (noCut) return `${subjectLabels[noCut] ?? noCut} 진도를 눌러주세요`;
  }
  if (scope.answer === 'custom') {
    // 확인은 **과목별**이다. 전역 플래그로 두면 영어를 직접 편집한 뒤 수학을 새로 추가했을 때
    // 수학은 자동으로 채워진 전 범위 그대로 통과한다 — '직접 고르기' 를 고른 의미가 사라진다(Codex).
    const unconfirmed = subjects.find(s => !isScopeConfirmed(s, scope));
    if (unconfirmed) {
      return `${subjectLabels[unconfirmed] ?? unconfirmed} 시험 범위를 골라주세요`;
    }
  }

  // 과목만 있고 단원이 비면 시간표가 만들어지지 않는다 — 직접 편집으로 비웠을 때 방어.
  const emptySubject = subjects.find(s => (units[s]?.length ?? 0) === 0);
  if (emptySubject) {
    return `'${subjectLabels[emptySubject] ?? emptySubject}' 과목의 단원을 1개 이상 선택해주세요`;
  }
  return null;
}

/** 해당 단계를 통과하지 못하는 이유 — 없으면 null */
export function stepBlocker(key: StepKey, form: PlannerForm, scope: ScopeState): string | null {
  if (key === 'goal') return goalBlocker(form);
  if (key === 'subjects') return scopeBlocker(form, scope);
  return null;
}

/** 지금 갈 수 있는 가장 뒤 단계 — 앞 단계가 막혀 있으면 건너뛰지 못한다 */
export function maxReachableStep(form: PlannerForm, scope: ScopeState): number {
  for (let i = 0; i < plannerStepConfig.length; i++) {
    if (stepBlocker(plannerStepConfig[i].key, form, scope)) return i + 1;
  }
  return plannerStepConfig.length;
}

/** 프리셋 회차가 있는 시험 종류인가 — 수능·모의고사는 전국이 같은 날 치른다 */
export function presetsForExamType(examType: ExamType, todayIso: string) {
  if (examType !== 'mock' && examType !== 'suneung') return [];
  return examPresets(examType, todayIso);
}

/**
 * 새 시간표의 시작 폼 — 기본 시험 종류의 회차가 하나뿐이면 날짜·이름까지 채워 둔다.
 * 카드는 이미 골라져 있는데 날짜만 비어 있으면 학생이 "고른 카드를 또 눌러야" 하는 상태가 된다.
 * 채운 값은 1단계 날짜 입력에서 그대로 고칠 수 있다.
 */
export function seededPlannerForm(todayIso = todayIsoKst()): PlannerForm {
  const presets = presetsForExamType(initialPlannerForm.examType, todayIso);
  if (presets.length !== 1) return initialPlannerForm;
  return withAutoExamName(initialPlannerForm, {
    ...initialPlannerForm,
    examStartDate: presets[0].date,
    examEndDate: presets[0].date,
  });
}
