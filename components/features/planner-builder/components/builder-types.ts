import {
  Target, Clock, BookOpen, Sparkles,
  Timer, Waves, Leaf, HandHeart, Flame,
  type LucideIcon,
} from 'lucide-react';
import { subjectLabels, type SubjectKey } from '@/lib/mock';
import { WEAKNESS_ENABLED } from '@/lib/flags';
import { examPresets, presetNameForDate } from '@/lib/planner/exam-presets';
import { inferElectives, subjectScope } from '@/lib/planner/exam-scope';

/**
 * 학생 플래너 빌더 폼 데이터.
 * 핸드오프 08 기반.
 *
 * 위저드는 **입력 3단계 + 확인 1단계**만 묻는다. 나머지 항목은 여기 기본값으로 채워
 * 보내고, 학생이 원하면 '직접 설정'에서 되돌려 받는다. 타입·저장 페이로드는 그대로다.
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
  // Step 7 — 동기 스타일
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

export const blockPatternMeta: Record<BlockPattern, { label: string; description: string; Icon: LucideIcon; spec: string }> = {
  pomodoro: { label: '포모도로',   Icon: Timer,  description: '짧은 집중 + 짧은 휴식 — 산만한 날에도 시작하기 쉬움',         spec: '25분 집중 / 5분 휴식 · 4사이클 후 긴 휴식' },
  focused:  { label: '집중',       Icon: Target, description: '평균 학생이 가장 효과 좋은 패턴 — 균형형',                    spec: '50분 집중 / 10분 휴식' },
  deep:     { label: '딥워크',     Icon: Waves,  description: '한 단원을 끝까지 — 시험 직전·휴일에 추천',                    spec: '90분 집중 / 15분 휴식' },
};

export const motivationStyleMeta: Record<MotivationStyle, { label: string; description: string; Icon: LucideIcon }> = {
  autonomous: { label: '자율형',   Icon: Leaf,      description: '봇이 잔소리 안 함. 진도·페이스 본인이 관리.' },
  guided:     { label: '가이드형', Icon: HandHeart, description: '오늘 목표·휴식 알림. 안 시작하면 한 번 부드럽게 환기.' },
  spartan:    { label: '스파르타', Icon: Flame,     description: '미시작 30분 = 알림. 부모/멘토 일일 보고 권장.' },
};

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
 * 알아낼 방법이 없다. 그 밖의 항목(시험명·목표·다짐·동기 스타일·알림)은 시간표 배치를
 * 바꾸지 않으므로 기본값으로 채워 보내고 '직접 설정'에서만 노출한다.
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
 * 최소 경로에서 뺀 항목(시험명·목표·다짐·동기 스타일)에 학생이 넣은 값이 있는가.
 * 수정 모드에서 '직접 설정'을 처음부터 켜 둘지 판단한다 — 만들 때 쓴 값이 접힌 채로
 * 숨어 있으면 "고칠 땐 안 보이는" 상태가 된다.
 */
export function hasCustomBasics(form: PlannerForm): boolean {
  if (form.motto?.trim()) return true;
  if (form.motivationStyle !== initialPlannerForm.motivationStyle) return true;
  if (form.examName?.trim() && form.examName !== autoExamName(form)) return true;
  const kind = examTypeMeta[form.examType ?? 'mock'].targetKind;
  if (kind === 'grade') return !!form.targetGrade?.trim();
  if (kind === 'score') return form.targetScore !== initialPlannerForm.targetScore;
  return !!form.targetGoal?.trim();
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
  /** 범위가 이미 확정된 과목 — 수정 모드 프리필·단원 직접 편집으로 넣은 과목 */
  settled: SubjectKey[];
};

/**
 * 초기 게이트 상태. 이미 범위가 있는 폼(= 수정 모드)은 확정된 것으로 본다 —
 * 만들 때 답한 걸 고칠 때 다시 묻지 않는다. 새로 만들 때는 아무것도 답하지 않은 상태.
 */
export function initialScopeState(form: PlannerForm): ScopeState {
  const units = form.subjectUnits ?? {};
  const subjects = Object.keys(units) as SubjectKey[];
  if (subjects.length === 0) {
    return { answer: null, electives: {}, progressCut: {}, settled: [] };
  }
  const electives: Partial<Record<SubjectKey, string[]>> = {};
  for (const s of subjects) electives[s] = inferElectives(s, units[s] ?? []);
  return { answer: 'custom', electives, progressCut: {}, settled: subjects };
}

/** 선택과목을 아직 고르지 않아 범위를 확정할 수 없는 과목인가 */
export function needsElective(subject: SubjectKey, scope: ScopeState): boolean {
  if (scope.settled.includes(subject)) return false;
  const spec = subjectScope(subject);
  return spec.choose > 0 && (scope.electives[subject]?.length ?? 0) < spec.choose;
}

/** 1단계를 통과하지 못하는 이유 — 없으면 null */
export function goalBlocker(form: PlannerForm): string | null {
  // 자유 목표는 **학생만 아는 값**이라 최소 경로에서도 받는다. 시험명처럼 파생할 근거가 없고
  // (BE `target.value` 는 free 일 때 비빈 문자열 필수라 빈 값이면 저장 자체가 400 이다),
  // 비워 두면 모든 플래너가 '자유 목표' 라는 같은 이름으로 저장된다.
  if (form.examType === 'other' && !form.targetGoal?.trim()) {
    return '무엇을 목표로 할지 적어주세요';
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
    const noCut = subjects.find(s => !scope.settled.includes(s) && !scope.progressCut[s]);
    if (noCut) return `${subjectLabels[noCut] ?? noCut} 진도를 눌러주세요`;
  }
  if (scope.answer === 'custom') {
    // 확인은 **과목별**이다. 전역 플래그로 두면 영어를 직접 편집한 뒤 수학을 새로 추가했을 때
    // 수학은 자동으로 채워진 전 범위 그대로 통과한다 — '직접 고르기' 를 고른 의미가 사라진다(Codex).
    const unconfirmed = subjects.find(s => !scope.settled.includes(s));
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
