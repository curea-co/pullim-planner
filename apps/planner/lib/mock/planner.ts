/**
 * 풀림 플래너 — 오늘 일정 + 시그니처 데이터 (컨디션·번아웃·감정).
 * 08_풀림_플래너_핸드오프.md 기반.
 */

import {
  BookOpen, PenLine, Target, Brain, FileText, MessageCircle, Mic, Coffee,
  type LucideIcon,
} from 'lucide-react';
import { currentPersona, type SubjectKey } from './persona';
import type { PaletteId } from '@/lib/tokens/palettes';
import type { LayoutTemplateId } from '@/lib/tokens/layout-templates';
import type { WeekLayoutId } from '@/lib/tokens/week-layouts';

export type BlockType =
  | 'concept'      // 개념 학습 (풀림 비주얼)
  | 'practice'    // 문제 풀이 (풀림 무한풀기)
  | 'review'      // 취약점 보강 (풀림 오답정복)
  | 'memorize'    // 암기 (풀림 기억장치)
  | 'mock'        // 모의 시험 (풀림 모의고사)
  | 'tutor'       // 개념 질문 (풀림 튜터)
  | 'self_explain'// 셀프 설명 (Active Recall)
  | 'break';      // 휴식

export type PedagogyEngineId =
  | 'spaced_repetition'
  | 'interleaving'
  | 'cognitive_load'
  | 'pomodoro'
  | 'active_recall'
  | 'deliberate_practice'
  | 'zeigarnik';

export type TimeBlock = {
  id: string;
  start: string;     // "HH:MM"
  end: string;
  subject: SubjectKey | 'rest';
  type: BlockType;
  title: string;
  /** 연계된 풀림 기능의 라우트 슬러그 */
  linkedFeatureSlug?: string;
  /** 3-Depth 교육과정 노드 id */
  curriculumNodeId?: string;
  /** 적용된 교육학 엔진 */
  engines: PedagogyEngineId[];
  /** 0~1, 미시작=0 */
  progress: number;
  status: 'todo' | 'doing' | 'done' | 'skipped';
  expectedMinutes: number;
  /** 완료 시 정확도 (%) */
  accuracy?: number;
  /** 완료 시 감정 (1=슬픔 ~ 5=기쁨) */
  emotion?: 1 | 2 | 3 | 4 | 5;
  /**
   * 비통상적 배치 사유 — "이 블록이 왜 여기 있는가"를 학생에게 설명.
   * 일반 블록은 undefined. 약점 보강·D-day 가중·이월 등 특수 사유에만 부여.
   */
  reasoning?: string;
};

export const blockTypeMeta: Record<BlockType, { label: string; Icon: LucideIcon; colorVar: string }> = {
  concept:      { label: '개념 학습',  Icon: BookOpen,       colorVar: 'var(--color-pullim-blue-300)' },
  practice:     { label: '문제 풀이',  Icon: PenLine,        colorVar: 'var(--color-pullim-blue-700)' },
  review:       { label: '취약점 보강', Icon: Target,         colorVar: 'var(--color-pullim-blue-900)' },
  memorize:     { label: '암기',      Icon: Brain,          colorVar: 'var(--color-pullim-blue-200)' },
  mock:         { label: '모의 시험',  Icon: FileText,       colorVar: 'var(--color-pullim-blue-500)' },
  tutor:        { label: '개념 질문',  Icon: MessageCircle,  colorVar: 'var(--color-pullim-blue-400)' },
  self_explain: { label: '셀프 설명',  Icon: Mic,            colorVar: 'var(--color-pullim-lemon)' },
  break:        { label: '휴식',      Icon: Coffee,         colorVar: 'var(--color-pullim-slate-300)' },
};

export const pedagogyEngineMeta: Record<PedagogyEngineId, { label: string; principle: string; example: string }> = {
  spaced_repetition: {
    label: '간격 복습',
    principle: '망각 곡선 기반으로 복습 간격을 늘려가며 장기 기억을 형성',
    example: '어제 오답 단어를 오늘·3일 후·7일 후에 다시 노출',
  },
  interleaving: {
    label: '교차 학습',
    principle: '비슷한 유형을 연달아 풀지 않고 다른 과목·유형과 섞어 학습',
    example: '수학·영어·국어를 40분 간격으로 교차 배치',
  },
  cognitive_load: {
    label: '인지 부하 관리',
    principle: '작업 기억의 한계를 고려해 어려운 학습 사이에 회복 시간 배치',
    example: '개념 40분 학습 → 10분 휴식 → 문제 풀이',
  },
  pomodoro: {
    label: '포모도로',
    principle: '25분 집중 + 5분 회복으로 집중력을 유지',
    example: '50분 블록을 25+5+20 분으로 분할',
  },
  active_recall: {
    label: '능동 인출',
    principle: '단순 읽기보다 "말로 설명·문제 풀이"가 학습 효과가 큼 (시험 효과)',
    example: '개념 학습 후 즉시 빈칸 문제로 인출 연습',
  },
  deliberate_practice: {
    label: '약점 집중',
    principle: '실력 점수가 낮은 유형에 학습 시간을 가중 배분',
    example: '오답률 60%인 빈칸 추론에 주 3회 보강 블록',
  },
  zeigarnik: {
    label: '미완성 효과',
    principle: '의도적으로 끝내지 않고 중단하면 다음 학습 동기가 강화됨',
    example: '문제 1개 남기고 종료 → 다음 블록에서 자연스럽게 시작',
  },
};

/**
 * 오늘의 학습 플랜 — 서연(고2 이과)의 저녁 학습.
 *
 * 참고 — `linkedFeatureSlug`는 14→8 통합 이전의 legacy slug
 * (`memory`, `conqueror`, `exam`)을 의도적으로 보존한다.
 * 매핑은 `getFeatureRoute`(features.ts)의 alias case가 처리.
 */
export const todayBlocks: TimeBlock[] = [
  {
    // 점심 직후 단어 복습을 빠뜨려 미수행으로 이월된 블록 — `skipped` 상태 시각 검증용
    id: 'b0', start: '13:30', end: '13:55',
    subject: 'english', type: 'memorize',
    title: '점심 직후 단어 복습 (어제 못한 25분)',
    linkedFeatureSlug: 'memory',
    curriculumNodeId: 'eng.vocab.high',
    engines: ['spaced_repetition'],
    progress: 0, status: 'skipped', expectedMinutes: 25,
    reasoning: '어제 못한 25분, 오늘로 이월했어요',
  },
  {
    id: 'b1', start: '17:30', end: '18:10',
    subject: 'math', type: 'concept',
    title: '미분 기본 공식 시각화',
    linkedFeatureSlug: 'visual',
    curriculumNodeId: 'math.calc_diff.application',
    engines: ['cognitive_load', 'active_recall'],
    progress: 1, status: 'done', expectedMinutes: 40,
    accuracy: 88, emotion: 4,
  },
  {
    id: 'b2', start: '18:10', end: '18:25',
    subject: 'rest', type: 'break',
    title: '저녁 식사',
    engines: [],
    progress: 0, status: 'done', expectedMinutes: 15,
  },
  {
    id: 'b3', start: '18:25', end: '19:25',
    subject: 'math', type: 'practice',
    title: '미분 — 적응형 문제 풀이',
    linkedFeatureSlug: 'infinity',
    curriculumNodeId: 'math.calc_diff.application',
    engines: ['pomodoro', 'deliberate_practice'],
    progress: 0.6, status: 'doing', expectedMinutes: 60,
    reasoning: 'D-day 빈출 가중',
  },
  {
    id: 'b4', start: '19:30', end: '20:00',
    subject: 'english', type: 'review',
    title: '빈칸 추론 정복 세트',
    linkedFeatureSlug: 'conqueror',
    curriculumNodeId: 'eng.blank.unit',
    engines: ['interleaving', 'deliberate_practice'],
    progress: 0, status: 'todo', expectedMinutes: 30,
    reasoning: '어제 오답 보강',
  },
  {
    id: 'b5', start: '20:05', end: '20:35',
    subject: 'english', type: 'memorize',
    title: '수능 빈출 어휘 50개 복습',
    linkedFeatureSlug: 'memory',
    curriculumNodeId: 'eng.vocab.high',
    engines: ['spaced_repetition', 'active_recall'],
    progress: 0, status: 'todo', expectedMinutes: 30,
  },
  {
    id: 'b6', start: '20:35', end: '21:15',
    subject: 'science', type: 'practice',
    title: '뉴턴 운동 법칙 — 실전 문제',
    linkedFeatureSlug: 'infinity',
    curriculumNodeId: 'sci.phy.mechanics.newton',
    engines: ['interleaving', 'pomodoro'],
    progress: 0, status: 'todo', expectedMinutes: 40,
  },
  {
    id: 'b7', start: '21:20', end: '22:00',
    subject: 'math', type: 'mock',
    title: '미적분 미니 모의고사',
    linkedFeatureSlug: 'exam',
    curriculumNodeId: 'math.calc',
    engines: ['zeigarnik', 'active_recall'],
    progress: 0, status: 'todo', expectedMinutes: 40,
  },
];

export function nextActiveBlock(blocks: TimeBlock[] = todayBlocks): TimeBlock | undefined {
  return blocks.find(b => b.status === 'doing') ?? blocks.find(b => b.status === 'todo');
}

/**
 * 오늘(Asia/Seoul, 고정 UTC+9·DST 없음) YYYY-MM-DD.
 * 하드코딩 데모일 대신 접속 시점의 실제 날짜를 기준으로 홈·D-day가 동작하도록.
 */
export function todayISO(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** day-view 날짜 네비게이션 기준일 — 접속 시점의 실제 오늘(KST). */
export const planBaseDate = todayISO();

/** todayBlocks(서연 데모)를 소유한 플래너 — 다른 시간표 활성 시 블록은 미생성. */
const DEMO_BLOCKS_PLANNER_ID = 'pl_001';

/**
 * day-view 날짜 offset(0=기준일)별 블록.
 * - 기준일 외 날짜: 빈 배열(데모 플랜 없음).
 * - 기준일이라도 **활성 플래너가 데모(pl_001)가 아니면** 빈 배열 — mock은 신규 시간표의
 *   블록을 생성하지 않으므로 데모 블록을 잘못 보여주지 않고 "정직한 빈 상태"를 보인다.
 *   (실제 블록 생성은 활성화 시 BE materialize — 06-30+)
 *
 * 활성 판정에 `getActivePlanner()`(이 mock store)를 쓰는 이유: **홈은 블록·활성 플래너를
 * 모두 이 mock 레이어에서 읽는다**(HomeContainer — dev/prod 공통, 아직 BE cutover 전).
 * 즉 이 게이트는 홈의 현재 데이터 소스와 일관된다.
 * - dev 우회: activatePlanner()가 이 store를 갱신 → 신규 플래너 활성 시 빈 상태가 의도대로 동작.
 * - prod: 홈이 아직 BE로 cutover되지 않아 종전에도 줄곧 pl_001 데모만 노출 → 이 PR로도 동일(회귀 없음).
 * 실 BE 활성 플래너 기준 블록 반영은 **홈→pullim-api cutover + materialize** 시점의 별 작업.
 */
export function getBlocksForDayOffset(offset: number): TimeBlock[] {
  if (offset !== 0) return [];
  return getActivePlanner().id === DEMO_BLOCKS_PLANNER_ID ? todayBlocks : [];
}

export function plannerProgress(blocks: TimeBlock[] = todayBlocks): { done: number; total: number; pct: number } {
  const learning = blocks.filter(b => b.type !== 'break');
  const done = learning.filter(b => b.status === 'done').length;
  const total = learning.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** 오늘의 컨디션 — 매일 아침 학생이 자기보고 (1=피곤, 3=보통, 5=쌩쌩) */
export type ConditionLevel = 1 | 2 | 3 | 4 | 5;
export const todayCondition: ConditionLevel = 3;
export const conditionMeta: Record<ConditionLevel, { emoji: string; label: string; difficultyAdj: string }> = {
  1: { emoji: '😴', label: '피곤해요',   difficultyAdj: '난이도 -20%' },
  2: { emoji: '🥱', label: '조금 피곤',   difficultyAdj: '난이도 -10%' },
  3: { emoji: '🙂', label: '보통이에요', difficultyAdj: '기본 난이도' },
  4: { emoji: '😊', label: '좋아요',     difficultyAdj: '난이도 +10%' },
  5: { emoji: '🤩', label: '쌩쌩!',      difficultyAdj: '난이도 +20%' },
};

/** 번아웃 지수 (0~100, 낮을수록 위험). 5개 지표 가중 평균. */
export type BurnoutFactor = {
  label: string;
  value: number;
  /** 표시 단위 — 라벨 매칭 fragile 코드를 제거하기 위한 명시 필드 */
  unit: 'h' | '%' | '/5' | '회';
  weight: number;
  status: 'good' | 'warn' | 'bad';
};

export type BurnoutSnapshot = {
  score: number;          // 0~100 (높을수록 좋음)
  trend: 'rising' | 'stable' | 'falling';
  factors: BurnoutFactor[];
  /** 권장 개입 — 시스템이 "오늘은 쉴래요" 제안 여부 */
  recommendBreak: boolean;
};

export const todayBurnout: BurnoutSnapshot = {
  score: 64,
  trend: 'falling',
  factors: [
    { label: '평균 수면 시간',    value: 5.8, unit: 'h',  weight: 0.30, status: 'warn' },
    { label: '연속 블록 완료율',  value: 78,  unit: '%',  weight: 0.25, status: 'good' },
    { label: '감정 평균',         value: 3.4, unit: '/5', weight: 0.20, status: 'good' },
    { label: '휴식 수용률',       value: 40,  unit: '%',  weight: 0.15, status: 'warn' },
    { label: '"쉴래요" 사용',     value: 1,   unit: '회', weight: 0.10, status: 'good' },
  ],
  recommendBreak: false,
};

/** 감정 체크인 옵션 — 매 블록 완료 후 (5종) */
export const emotionEmojis: Record<NonNullable<TimeBlock['emotion']>, string> = {
  1: '😔', 2: '😤', 3: '😐', 4: '🙂', 5: '😊',
};

/* ─── 일일 회고 — 메트릭 + 인사이트 ─────────────────────────────────── */

export type DailyReflectionMetrics = {
  /** 계획된 학습 시간(분) — break 제외 */
  plannedMin: number;
  /** 실제 학습 시간(분) — done 전체 + doing은 progress 비율 */
  actualMin: number;
  /** 학습 블록 완료율 (%) — done / (done+doing+todo+skipped) */
  completionPct: number;
  /** 완료 블록의 평균 정확도(%) — accuracy 있는 블록만 */
  avgAccuracy: number | null;
  /** 완료 블록의 평균 감정 (1~5) — emotion 있는 블록만 */
  avgEmotion: number | null;
  /** done 카운트 */
  completedCount: number;
  /** skipped 카운트 */
  skippedCount: number;
  /** doing 카운트 */
  doingCount: number;
  /** todo 카운트 */
  todoCount: number;
  /** 학습 블록 총 개수 (break 제외) */
  totalLearning: number;
};

/** 학습 블록만 추리고 메트릭 계산 — 휴식 블록은 모든 카운트에서 제외 */
export function dailyReflection(blocks: TimeBlock[] = todayBlocks): DailyReflectionMetrics {
  const learning = blocks.filter(b => b.type !== 'break');
  const total = learning.length;
  const done = learning.filter(b => b.status === 'done');
  const doing = learning.filter(b => b.status === 'doing');
  const todo = learning.filter(b => b.status === 'todo');
  const skipped = learning.filter(b => b.status === 'skipped');

  const plannedMin = learning.reduce((s, b) => s + b.expectedMinutes, 0);
  const actualMin =
    done.reduce((s, b) => s + b.expectedMinutes, 0)
    + doing.reduce((s, b) => s + Math.round(b.expectedMinutes * b.progress), 0);

  const accVals = done.map(b => b.accuracy).filter((a): a is number => typeof a === 'number');
  const emoVals = done.map(b => b.emotion).filter((e): e is NonNullable<TimeBlock['emotion']> => typeof e === 'number');

  return {
    plannedMin,
    actualMin,
    completionPct: total === 0 ? 0 : Math.round((done.length / total) * 100),
    avgAccuracy: accVals.length === 0 ? null : Math.round(accVals.reduce((a, b) => a + b, 0) / accVals.length),
    avgEmotion: emoVals.length === 0 ? null : Math.round((emoVals.reduce((a, b) => a + b, 0) / emoVals.length) * 10) / 10,
    completedCount: done.length,
    skippedCount: skipped.length,
    doingCount: doing.length,
    todoCount: todo.length,
    totalLearning: total,
  };
}

export type ReflectionInsight = {
  icon: 'sparkle' | 'warn' | 'check';
  text: string;
};

/**
 * 룰 기반 인사이트 — 데모 단계의 결정론적 mock.
 * 실제 LLM 호출은 후속 단계. 지금은 메트릭/블록 상태에서 자연 추론 가능한 텍스트만.
 */
export function tomorrowDifferences(blocks: TimeBlock[] = todayBlocks): ReflectionInsight[] {
  const m = dailyReflection(blocks);
  const out: ReflectionInsight[] = [];

  // 정복 신호 — 약점 보강 reasoning 블록이 90%+ 정답률
  const conqueredWeakness = blocks.find(
    b => b.reasoning === '어제 오답 보강' && b.status === 'done' && (b.accuracy ?? 0) >= 90,
  );
  if (conqueredWeakness) {
    out.push({
      icon: 'check',
      text: `${conqueredWeakness.title.split(' ')[0]} 정복 — 내일 보강 블록 1개 줄어들어요`,
    });
  }

  // 새 단원 진입 신호 — 평균 정확도 85% 이상
  if (m.avgAccuracy !== null && m.avgAccuracy >= 85) {
    out.push({
      icon: 'sparkle',
      text: `평균 정답률 ${m.avgAccuracy}% — 내일은 새 단원으로 진입`,
    });
  }

  // 미수행 신호 — skipped 블록 우선 재배치
  if (m.skippedCount > 0) {
    const skippedBlock = blocks.find(b => b.status === 'skipped');
    out.push({
      icon: 'warn',
      text: `${skippedBlock?.subject === 'english' ? '단어 복습' : '이월된 블록'} — 내일 우선 재배치`,
    });
  }

  // 감정 신호 — 평균 감정 ≤ 2.5
  if (m.avgEmotion !== null && m.avgEmotion <= 2.5) {
    out.push({
      icon: 'warn',
      text: '감정 평균이 낮아요 — 내일 난이도 자동 −10%',
    });
  }

  // 컨디션 좋은 날 — 평균 감정 ≥ 4
  if (m.avgEmotion !== null && m.avgEmotion >= 4 && out.length < 3) {
    out.push({
      icon: 'sparkle',
      text: '오늘 흐름이 좋아요 — 내일도 비슷한 패턴 유지',
    });
  }

  // 빈 결과 방지 — 일반 안내
  if (out.length === 0) {
    out.push({
      icon: 'sparkle',
      text: '오늘 결과가 내일 플랜에 자동 반영돼요',
    });
  }

  return out.slice(0, 4);
}

/** 7일치 학습 시간 (시간 단위) — 주간 그래프용 */
export const weeklyStudyHours: { day: string; hours: number; goal: number }[] = [
  { day: '월', hours: 4.2, goal: 4.0 },
  { day: '화', hours: 3.8, goal: 4.0 },
  { day: '수', hours: 5.1, goal: 4.0 },
  { day: '목', hours: 2.4, goal: 4.0 },
  { day: '금', hours: 4.6, goal: 4.0 },
  { day: '토', hours: 6.0, goal: 5.0 },
  { day: '일', hours: 3.2, goal: 5.0 },
];

/** 지난 주 요약 — Weekly 회고의 "vs 지난 주" 비교용 */
export type WeekSummarySnapshot = {
  totalHours: number;
  goalHours: number;
  completionAvg: number;
  avgAccuracy: number;
  avgEmotion: number;
  weakConquered: number;
};

export const lastWeekSummary: WeekSummarySnapshot = {
  totalHours: 25.4,
  goalHours: 30.0,
  completionAvg: 78,
  avgAccuracy: 76,
  avgEmotion: 3.6,
  weakConquered: 1,
};

export type WeeklyReflectionMetrics = {
  totalHours: number;
  goalHours: number;
  /** 7일 평균 완료율(%) */
  completionAvg: number;
  /** 7일 평균 정답률(%) — done 블록 평균. 데모: 일간 평균을 기반으로 변동 */
  avgAccuracy: number;
  /** 7일 평균 감정(1~5) — 데모: 결정론적 mock */
  avgEmotion: number;
  /** 약점 정복 카운트 */
  weakConquered: number;
};

/** 주간 회고 메트릭 — weekView·weeklyStudyHours 기반 결정론적 산출. 일간 차용 X. */
export function weeklyReflection(): WeeklyReflectionMetrics {
  const totalHours = Math.round(weeklyStudyHours.reduce((s, d) => s + d.hours, 0) * 10) / 10;
  const goalHours = weeklyStudyHours.reduce((s, d) => s + d.goal, 0);
  const completionAvg = Math.round(
    weekView.reduce((s, d) => s + d.completionPct, 0) / weekView.length,
  );
  // 데모: 결정론적 평균 — 일간 평균(88%)과 살짝 다르게 주간 평균은 82%
  const avgAccuracy = 82;
  const avgEmotion = 3.8;
  // 약점 정복: getWeakNodes mastery 0.7~0.85 카운트는 컴포넌트에서 산출. 여기선 baseline.
  const weakConquered = 2;
  return { totalHours, goalHours, completionAvg, avgAccuracy, avgEmotion, weakConquered };
}

/**
 * 이번 주 인사이트 — weekView·weeklyStudyHours·weeklyReflection 기반 룰 생성.
 * `tomorrowDifferences` 일간 패턴의 주간 버전.
 */
export function thisWeekInsights(): ReflectionInsight[] {
  const m = weeklyReflection();
  const out: ReflectionInsight[] = [];

  // 정답률 트렌드
  if (m.avgAccuracy >= lastWeekSummary.avgAccuracy + 5) {
    out.push({
      icon: 'sparkle',
      text: `정답률 +${m.avgAccuracy - lastWeekSummary.avgAccuracy}% — 새 단원 진입 적기`,
    });
  }

  // 약점 정복
  if (m.weakConquered >= 1) {
    out.push({
      icon: 'check',
      text: `약점 ${m.weakConquered}건 정복 — 다음 주 보강 블록 줄어들어요`,
    });
  }

  // 시간 부족 — 평일 최저 시간 day 식별
  const weekdays = weeklyStudyHours.slice(0, 5);
  const worst = weekdays.reduce((a, b) => (a.hours < b.hours ? a : b));
  if (worst.hours < worst.goal * 0.7) {
    out.push({
      icon: 'warn',
      text: `${worst.day} 학습 시간 부족 (${worst.hours}h / 목표 ${worst.goal}h) — 평일 시간대 점검`,
    });
  }

  // 감정 평균
  if (m.avgEmotion <= 2.8) {
    out.push({
      icon: 'warn',
      text: '감정 평균이 낮아요 — 다음 주 난이도 자동 조정',
    });
  } else if (m.avgEmotion >= 4) {
    out.push({
      icon: 'sparkle',
      text: '이번 주 흐름이 좋아요 — 패턴 유지',
    });
  }

  if (out.length === 0) {
    out.push({
      icon: 'sparkle',
      text: '주간 결과가 다음 주 플랜에 자동 반영돼요',
    });
  }

  return out.slice(0, 4);
}

/* ─── 컨디션·번아웃 trend — 7일치 (회고 노출용) ─────────────────────── */

/** 7일치 컨디션 trend — 회고 미니 차트용. weeklyStudyHours와 같은 day 순서. */
export const weeklyConditionTrend: { day: string; level: ConditionLevel }[] = [
  { day: '월', level: 4 },
  { day: '화', level: 3 },
  { day: '수', level: 4 },
  { day: '목', level: 3 },
  { day: '금', level: 2 },
  { day: '토', level: 4 },
  { day: '일', level: 3 },
];

/** 7일치 번아웃 스코어 trend — 0~100, 낮을수록 위험. */
export const weeklyBurnoutTrend: { day: string; score: number }[] = [
  { day: '월', score: 72 },
  { day: '화', score: 68 },
  { day: '수', score: 70 },
  { day: '목', score: 64 },
  { day: '금', score: 58 },
  { day: '토', score: 66 },
  { day: '일', score: 71 },
];

/**
 * 주간 인사이트 카드 — 11-planner-design § 6.1.
 * 학생이 처음 보는 화면이 "데이터 덤프"가 아닌 "선생님 멘트".
 * 카피 톤은 07 § 4.5.1 4원칙 준수 — 평가어 금지, 관찰어·권유형.
 *
 * `kind` 가 액션 칩 라우팅의 키 (시간표 조정, 블록 줄이기 등).
 */
export type WeeklyInsight = {
  emoji: string;
  headline: string;
  /** action 칩 텍스트 + 동작 키 (현 시점은 toast로 대응) */
  action?: { label: string; kind: 'adjust_schedule' | 'reduce_block' | 'review_weak' | 'celebrate' };
  /** 카드 강조 톤 */
  tone: 'good' | 'warn' | 'info';
};

export const weeklyInsights: WeeklyInsight[] = [
  {
    emoji: '📈',
    headline: '수학 정답률 +12% — 새 단원 진입 적기',
    action: { label: '시간표 조정', kind: 'adjust_schedule' },
    tone: 'good',
  },
  {
    emoji: '⏱',
    headline: '화요일 학습 시간이 짧았어요. 평일 시간대 점검해볼까요?',
    action: { label: '시간표 조정', kind: 'adjust_schedule' },
    tone: 'info',
  },
  {
    emoji: '🔋',
    headline: '금요일 부담 신호 — 토요일 30분 줄여볼까요?',
    action: { label: '블록 줄이기', kind: 'reduce_block' },
    tone: 'warn',
  },
  {
    emoji: '💪',
    headline: '17일 연속 1블록 이상 완료 — 흐름 유지',
    tone: 'good',
  },
];

/* ─── 부모 전송 카드 — Reports `부모님께 보내기` 후 큐레이션 ────────── */

export type ParentReportCard = {
  /** 카드 헤드라인 */
  headline: string;
  /** 핵심 메트릭 3 — 부모가 즉시 알고 싶은 것 */
  metrics: { label: string; value: string; tone: 'good' | 'default' | 'warn' }[];
  /** 한 줄 정성 평가 — AI 코치 톤 */
  comment: string;
  /** 다가오는 시험·마일스톤 */
  upcomingMilestone: string | null;
  /** 격려/응원 한 줄 */
  encouragement: string;
};

/** 학생 view를 그대로 보내지 않고 부모용으로 큐레이션 — 정답률·시간·약점 정복 + AI 코멘트. */
export function buildParentReport(): ParentReportCard {
  const w = weeklyReflection();
  const milestone = getNextMilestone();
  const milestoneText = milestone
    ? `4월 ${milestone.day.date}일 · ${milestone.day.examMilestone?.label} (D-${milestone.daysAway})`
    : null;
  return {
    headline: `이번 주 학습 요약 · ${currentPersona.name ?? '서연'} 학생`,
    metrics: [
      { label: '학습 시간', value: `${w.totalHours}h / ${w.goalHours}h`, tone: w.totalHours >= w.goalHours ? 'good' : 'default' },
      { label: '평균 정답률', value: `${w.avgAccuracy}%`, tone: w.avgAccuracy >= 80 ? 'good' : 'default' },
      { label: '약점 정복', value: `${w.weakConquered}건`, tone: w.weakConquered > 0 ? 'good' : 'default' },
    ],
    comment: w.avgAccuracy >= 80
      ? '학습 흐름이 안정적이에요. 새 단원 진입을 시도해도 좋은 시점입니다.'
      : '꾸준한 학습이 이어지고 있어요. 다음 주는 약점 단원에 집중하는 게 좋겠습니다.',
    upcomingMilestone: milestoneText,
    encouragement: '오늘도 따뜻한 응원 한마디 부탁드려요 💌',
  };
}

/** 주간 — 일별·블록 타입별 카운트 (week view 그리드용) */
export type WeekDay = {
  day: string;          // '월'
  date: number;         // 21
  isToday: boolean;
  blocks: { type: BlockType; count: number; minutes: number }[];
  totalMinutes: number;
  completionPct: number;
  /** 오늘 대비 일 오프셋 — 일간 뷰 딥링크용(실데이터 B4b). mock 데모엔 없음(bypass=토스트 폴백). */
  dayOffset?: number;
};

export const weekView: WeekDay[] = [
  { day: '월', date: 20, isToday: false, totalMinutes: 252, completionPct: 100,
    blocks: [
      { type: 'concept',  count: 1, minutes: 40 },
      { type: 'practice', count: 2, minutes: 100 },
      { type: 'review',   count: 1, minutes: 30 },
      { type: 'memorize', count: 1, minutes: 30 },
      { type: 'mock',     count: 1, minutes: 40 },
    ],
  },
  { day: '화', date: 21, isToday: false, totalMinutes: 228, completionPct: 95,
    blocks: [
      { type: 'concept',  count: 2, minutes: 60 },
      { type: 'practice', count: 2, minutes: 90 },
      { type: 'memorize', count: 1, minutes: 30 },
      { type: 'tutor',    count: 1, minutes: 30 },
      { type: 'self_explain', count: 1, minutes: 18 },
    ],
  },
  { day: '수', date: 22, isToday: false, totalMinutes: 306, completionPct: 100,
    blocks: [
      { type: 'concept',  count: 1, minutes: 40 },
      { type: 'practice', count: 3, minutes: 150 },
      { type: 'review',   count: 1, minutes: 30 },
      { type: 'memorize', count: 1, minutes: 30 },
      { type: 'mock',     count: 1, minutes: 40 },
      { type: 'self_explain', count: 1, minutes: 16 },
    ],
  },
  { day: '목', date: 23, isToday: false, totalMinutes: 240, completionPct: 100,
    blocks: [
      { type: 'concept',  count: 1, minutes: 40 },
      { type: 'practice', count: 2, minutes: 100 },
      { type: 'review',   count: 1, minutes: 30 },
      { type: 'memorize', count: 1, minutes: 30 },
      { type: 'mock',     count: 1, minutes: 40 },
    ],
  },
  { day: '금', date: 24, isToday: true,  totalMinutes: 280, completionPct: 35,
    blocks: [
      { type: 'concept',  count: 2, minutes: 80 },
      { type: 'practice', count: 2, minutes: 100 },
      { type: 'review',   count: 1, minutes: 30 },
      { type: 'memorize', count: 1, minutes: 30 },
      { type: 'tutor',    count: 1, minutes: 40 },
    ],
  },
  { day: '토', date: 25, isToday: false, totalMinutes: 360, completionPct: 0,
    blocks: [
      { type: 'concept',  count: 2, minutes: 80 },
      { type: 'practice', count: 3, minutes: 150 },
      { type: 'review',   count: 1, minutes: 30 },
      { type: 'mock',     count: 2, minutes: 80 },
      { type: 'self_explain', count: 1, minutes: 20 },
    ],
  },
  { day: '일', date: 26, isToday: false, totalMinutes: 192, completionPct: 0,
    blocks: [
      { type: 'concept',  count: 1, minutes: 40 },
      { type: 'practice', count: 2, minutes: 90 },
      { type: 'memorize', count: 1, minutes: 30 },
      { type: 'self_explain', count: 1, minutes: 32 },
    ],
  },
];

/** 월간 캘린더 — 30일치 완료율·블록 수 (heatmap) */
export type ExamMilestone = {
  /** 카드/툴팁에 표기할 라벨 */
  label: string;
  /** 우선순위 — high면 월간 카드의 hero 자리. mid는 보조. */
  importance: 'high' | 'mid';
};

export type MonthDay = {
  date: number;
  weekday: '월' | '화' | '수' | '목' | '금' | '토' | '일';
  blockCount: number;       // 0~10
  completionPct: number;    // 0~100
  isToday?: boolean;
  isFuture?: boolean;
  /** 시험·모평·중요 마감 — 표시 상세는 `examMilestone` 참고 */
  hasExamMilestone?: boolean;
  /** 일정 메타 — month-view 시험 카드를 동적화 */
  examMilestone?: ExamMilestone;
  /** 오늘 대비 일 오프셋 — 일간 뷰 딥링크용(실데이터 B4b). mock 데모엔 없음(bypass=토스트 폴백). */
  dayOffset?: number;
};

const weekdays = ['월', '화', '수', '목', '금', '토', '일'] as const;

/** 4월에 분포한 시험·모평 마일스톤 (요구사항: 2~3건 분포) */
const EXAM_MILESTONES: Record<number, ExamMilestone> = {
  9:  { label: '단원 평가 — 미적분 II', importance: 'mid' },
  18: { label: '교내 영어 단어 시험',   importance: 'mid' },
  30: { label: '4월 학력평가',          importance: 'high' },
};

function makeMonth(): MonthDay[] {
  // 4월 — 30일치. 24일이 오늘 (금요일, 4/1=수 실달력).
  // 결정론적으로 생성 (SSR/CSR 일치 보장).
  const days: MonthDay[] = [];
  const today = 24;
  // 4/1은 수요일이라 가정 → weekday cycle 시작
  let weekdayIdx = 2;
  // 결정론적 의사 난수 (선형 합동)
  const seq = (n: number, m: number) => ((n * 9301 + 49297) % 233280) % m;
  for (let d = 1; d <= 30; d++) {
    const wd = weekdays[weekdayIdx];
    const isWeekend = wd === '토' || wd === '일';
    const isToday = d === today;
    const isFuture = d > today;
    let blockCount = 0;
    let completionPct = 0;

    if (!isFuture) {
      blockCount = isWeekend ? 6 + seq(d, 3) : 5 + seq(d + 1, 3);
      // 평일 일부 + 주말 첫째 토요일은 완벽 달성한 날(100%)로 시드
      const isPerfect = [3, 8, 15, 22].includes(d);
      completionPct = isToday ? 35 : (isPerfect ? 100 : 75 + seq(d + 2, 24));
    } else {
      blockCount = isWeekend ? 7 : 5;
      completionPct = 0;
    }

    const milestone = EXAM_MILESTONES[d];

    days.push({
      date: d,
      weekday: wd,
      blockCount,
      completionPct,
      isToday,
      isFuture,
      hasExamMilestone: !!milestone,
      examMilestone: milestone,
    });
    weekdayIdx = (weekdayIdx + 1) % 7;
  }
  return days;
}

export const monthView = makeMonth();

/**
 * 다가오는 high importance 마일스톤 — 월간 시험 카드의 hero 자리에 노출.
 * 오늘 이후 가장 가까운 high를 우선, 없으면 가장 가까운 mid.
 */
export function getNextMilestone(): { day: MonthDay; daysAway: number } | null {
  const today = monthView.find(d => d.isToday);
  if (!today) return null;
  const upcoming = monthView.filter(d => d.examMilestone && d.date >= today.date);
  if (upcoming.length === 0) return null;
  const high = upcoming.find(d => d.examMilestone?.importance === 'high');
  const target = high ?? upcoming[0];
  return { day: target, daysAway: target.date - today.date };
}

/* ─── 다중 플래너 — Plan 1 데이터 모델 ─────────────────────────────── */

/**
 * `Planner` 타입 — 학생이 동시에 가질 수 있는 N개 시간표.
 *
 * 호환 메모: `currentPersona.examLabel`·`getDday`·`todayBlocks`는
 * *활성 플래너*의 데이터로 시드되어 있어 기존 callsite는 그대로 동작.
 *
 * Plan 2~4에서 라우트·UI가 다중 플래너를 노출하도록 점진 마이그.
 *
 * 값 호환: `examType`/`blockPattern`/`motivationStyle` union은 builder-types와
 * 동일 string set이라 양쪽이 자동 호환 (TS structural typing).
 */
type PlannerExamType = 'mock' | 'suneung' | 'midterm' | 'final' | 'other';
type PlannerBlockPattern = 'pomodoro' | 'focused' | 'deep';
type PlannerMotivationStyle = 'autonomous' | 'guided' | 'spartan';
type PlannerTargetKind = 'grade' | 'score' | 'free';

export type Planner = {
  id: string;
  /** 학생이 식별하는 이름 — "6월 모의평가" 등 */
  name: string;
  examType: PlannerExamType;
  /** UI에 노출하는 시험 라벨 — name과 다를 수 있음 (학교 내신 등) */
  examLabel: string;
  examStartDate: string;        // YYYY-MM-DD
  examEndDate: string;
  target: { kind: PlannerTargetKind; value: number | string };
  weekdayHours: { start: number; end: number };
  weekendHours: { start: number; end: number };
  subjectUnits: Partial<Record<SubjectKey, string[]>>;
  blockPattern: PlannerBlockPattern;
  weaknessAutoReflect: boolean;
  motivationStyle: PlannerMotivationStyle;
  motto: string;
  /** 한 시점에 1개만 active. activatePlanner로 변경 */
  active: boolean;
  /** 시험 종료 후 자동 또는 수동 archived. 관리 페이지에서 토글로 노출 */
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  /**
   * 시간표 꾸미기 — 일간/주간 레이아웃 + 색상 팔레트.
   * 미지정 시 {vertical_timeline, matrix_by_type, pullim_blue}로 폴백 (기존 동작 무변경).
   */
  customization?: {
    layoutId: LayoutTemplateId;        // 일간
    weekLayoutId?: WeekLayoutId;       // 주간 (옵셔널 — 미지정 시 matrix_by_type)
    paletteId: PaletteId;
  };
};

/**
 * 시드 3건 — active 1, inactive 1, archived 1.
 *
 * factory 패턴: 매 호출마다 fresh literal 반환. `resetMockState()`가 mutate된
 * 모듈 상태를 원본 시드로 되돌릴 때 재사용.
 */
function buildInitialPlanners(): Planner[] {
  return [
    {
      id: 'pl_001',
      name: '6월 모의평가',
      examType: 'mock',
      examLabel: '6월 모의평가',
      examStartDate: '2026-06-04',
      examEndDate: '2026-06-04',
      target: { kind: 'grade', value: 1 },
      weekdayHours: { start: 18, end: 23 },
      weekendHours: { start: 10, end: 22 },
      subjectUnits: {
        math: ['미적분', '확률과 통계'],
        english: ['독해', '수능특강 영어 3강'],
        science: ['역학과 에너지'],
      },
      blockPattern: 'focused',
      weaknessAutoReflect: true,
      motivationStyle: 'guided',
      motto: '영어 빈칸 추론 1등급 사수',
      active: true,
      archived: false,
      createdAt: '2026-04-15T09:00:00',
      updatedAt: '2026-04-23T20:00:00',
      customization: { layoutId: 'vertical_timeline', weekLayoutId: 'matrix_by_type', paletteId: 'pullim_blue' },
    },
    {
      id: 'pl_002',
      name: '1학기 기말고사',
      examType: 'final',
      examLabel: '1학기 기말고사',
      examStartDate: '2026-06-27',
      examEndDate: '2026-07-01',
      target: { kind: 'score', value: 90 },
      weekdayHours: { start: 19, end: 22 },
      weekendHours: { start: 14, end: 20 },
      subjectUnits: {
        math: ['미적분 II'],
        english: ['독해'],
        korean: ['문학'],
        science: ['전자기학'],
      },
      blockPattern: 'pomodoro',
      weaknessAutoReflect: true,
      motivationStyle: 'guided',
      motto: '내신 1등급',
      active: false,
      archived: false,
      createdAt: '2026-04-20T10:00:00',
      updatedAt: '2026-04-20T10:00:00',
      // 색상: playbook 가드 정합 — forest(초록 큰 면) → pullim_blue(블루+레몬 액센트). color-palette green 회피.
      customization: { layoutId: 'block_cards', weekLayoutId: 'school_grid', paletteId: 'pullim_blue' },
    },
    {
      id: 'pl_003',
      name: '4월 학력평가',
      examType: 'mock',
      examLabel: '4월 학평',
      examStartDate: '2026-04-15',
      examEndDate: '2026-04-15',
      target: { kind: 'grade', value: 2 },
      weekdayHours: { start: 18, end: 22 },
      weekendHours: { start: 10, end: 20 },
      subjectUnits: {
        math: ['미적분 I'],
        english: ['독해'],
        science: ['역학'],
      },
      blockPattern: 'focused',
      weaknessAutoReflect: true,
      motivationStyle: 'autonomous',
      motto: '',
      active: false,
      archived: true,
      createdAt: '2026-03-25T09:00:00',
      updatedAt: '2026-04-15T22:00:00',
      customization: { layoutId: 'pie_list', weekLayoutId: 'heatmap', paletteId: 'sunset' },
    },
  ];
}

export const planners: Planner[] = buildInitialPlanners();

/**
 * mock 모듈 상태를 초기 시드로 되돌린다. 개발자 도구(DevResetButton) 전용.
 * 현재는 `planners`만 mutate 대상. mutate 가능한 mock이 추가되면 여기에 합쳐 reset.
 */
export function resetMockState(): void {
  planners.length = 0;
  for (const p of buildInitialPlanners()) planners.push(p);
}

/** 활성 플래너 — 한 시점에 1개. 못 찾으면 첫 비-archived. */
export function getActivePlanner(): Planner {
  const active = planners.find(p => p.active && !p.archived);
  if (active) return active;
  const fallback = planners.find(p => !p.archived);
  if (fallback) return fallback;
  throw new Error('No active planner');
}

/** 카드 그리드용 — 기본 archived 제외 */
export function getPlanners(opts?: { includeArchived?: boolean }): Planner[] {
  const includeArchived = opts?.includeArchived ?? false;
  return includeArchived ? [...planners] : planners.filter(p => !p.archived);
}

export function findPlanner(id: string): Planner | undefined {
  return planners.find(p => p.id === id);
}

/** 활성 플래너 변경 — 다른 모든 플래너 비활성. archived는 활성화 불가 */
export function activatePlanner(id: string): void {
  const target = planners.find(p => p.id === id);
  if (!target) throw new Error(`Planner not found: ${id}`);
  if (target.archived) throw new Error('Cannot activate archived planner');
  for (const p of planners) p.active = false;
  target.active = true;
  target.updatedAt = new Date().toISOString();
}

export function createPlanner(
  input: Omit<Planner, 'id' | 'active' | 'archived' | 'createdAt' | 'updatedAt'>,
): Planner {
  const now = new Date().toISOString();
  const planner: Planner = {
    ...input,
    id: `pl_${Date.now()}`,
    active: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  planners.push(planner);
  return planner;
}

export function updatePlanner(
  id: string,
  patch: Partial<Omit<Planner, 'id' | 'createdAt'>>,
): void {
  const target = planners.find(p => p.id === id);
  if (!target) throw new Error(`Planner not found: ${id}`);
  Object.assign(target, patch, { updatedAt: new Date().toISOString() });
}

/** 활성 플래너는 삭제 불가 — 다른 플래너 활성화 후 삭제하도록 가드 */
export function deletePlanner(id: string): void {
  const idx = planners.findIndex(p => p.id === id);
  if (idx < 0) throw new Error(`Planner not found: ${id}`);
  if (planners[idx].active) throw new Error('Cannot delete active planner');
  planners.splice(idx, 1);
}

/** 활성 플래너는 아카이브 불가 — 다른 플래너 활성화 후 아카이브 */
export function archivePlanner(id: string): void {
  const target = planners.find(p => p.id === id);
  if (!target) throw new Error(`Planner not found: ${id}`);
  if (target.active) throw new Error('Cannot archive active planner');
  target.archived = true;
  target.updatedAt = new Date().toISOString();
}

export function duplicatePlanner(id: string): Planner {
  const src = planners.find(p => p.id === id);
  if (!src) throw new Error(`Planner not found: ${id}`);
  const now = new Date().toISOString();
  const dup: Planner = {
    ...src,
    id: `pl_${Date.now()}`,
    name: `${src.name} (복사)`,
    active: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  planners.push(dup);
  return dup;
}

/** 시간표 꾸미기 — 레이아웃 템플릿 + 팔레트 저장. */
export function updatePlannerCustomization(
  id: string,
  customization: NonNullable<Planner['customization']>,
): Planner {
  const target = planners.find(p => p.id === id);
  if (!target) throw new Error(`Planner not found: ${id}`);
  target.customization = { ...customization };
  target.updatedAt = new Date().toISOString();
  return target;
}
