import {
  Target, Clock, BookOpen, Hourglass, Flame, Heart, Bell, Sparkles,
  Timer, Waves, Leaf, HandHeart,
  type LucideIcon,
} from 'lucide-react';
import type { SubjectKey } from '@/lib/mock';

/**
 * 학생 플래너 빌더 8단계 폼 데이터.
 * 핸드오프 08 기반.
 */

export type BlockPattern = 'pomodoro' | 'focused' | 'deep';
export type MotivationStyle = 'autonomous' | 'guided' | 'spartan';

/**
 * 시험 종류 — 단일일자(mock/suneung/other)와 범위(midterm/final).
 * 중간/기말고사는 보통 3~5일 동안 진행되어 시작일과 종료일이 모두 의미 있음.
 */
export type ExamType = 'mock' | 'suneung' | 'midterm' | 'final' | 'other';

export type TargetKind = 'grade' | 'score' | 'free';

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
  targetGrade: 1 | 2 | 3 | 4;  // 모의·수능
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
  // Step 5 — 약점 자동 반영 (가중치 fine-tune은 AI에 위임)
  weaknessAutoReflect: boolean;
  /** @deprecated 의미 모호로 v2에서 제거 */
  weaknessWeight?: number;
  // Step 6 — 동기 스타일
  motivationStyle: MotivationStyle;
  // Step 7 — 리마인더
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
  targetGrade: 1,
  targetScore: 90,
  targetGoal: '',
  motto: '',
  weekdayHours: { start: 18, end: 23 },
  weekendHours: { start: 10, end: 22 },
  subjectUnits: {
    math:    ['미적분', '확률과 통계'],
    english: ['독해', '수능특강 영어 3강'],          // 자유 입력 예시
    science: ['역학과 에너지'],
  },
  blockPattern: 'focused',
  weaknessAutoReflect: true,
  motivationStyle: 'guided',
  remindKakao: true,
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

export type StepInfo = {
  num: number;
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
    targetGrade: (p.target.kind === 'grade' ? p.target.value : 1) as PlannerForm['targetGrade'],
    targetScore: p.target.kind === 'score' ? Number(p.target.value) : 90,
    targetGoal: p.target.kind === 'free' ? String(p.target.value) : '',
    motto: p.motto,
    weekdayHours: { ...p.weekdayHours },
    weekendHours: { ...p.weekendHours },
    subjectUnits: { ...p.subjectUnits },
    blockPattern: p.blockPattern,
    weaknessAutoReflect: p.weaknessAutoReflect,
    motivationStyle: p.motivationStyle,
    // 알림 설정은 Planner 메타에 미보존 — 기본값 사용 (별도 사용자 설정으로 분리 예정)
    remindKakao: true,
    remindPush: true,
    remindBefore5min: true,
    parentDailyReport: false,
  };
}

/** 빌더 폼 → Planner 패치 — 수정 저장·신규 생성에 사용 */
export function formToPlannerPatch(form: PlannerForm): Omit<Planner, 'id' | 'active' | 'archived' | 'createdAt' | 'updatedAt'> {
  const kind = examTypeMeta[form.examType ?? 'mock'].targetKind;
  const target =
    kind === 'grade' ? { kind: 'grade' as const, value: form.targetGrade }
    : kind === 'score' ? { kind: 'score' as const, value: form.targetScore }
    : { kind: 'free' as const, value: form.targetGoal };

  return {
    name: form.examName,
    examType: form.examType,
    examLabel: form.examName,
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

export const plannerStepConfig: readonly StepInfo[] = [
  { num: 1, label: '목표',      icon: Target,    title: '목표 · D-day',         description: '시험 종류(모의/수능/중간/기말/기타)에 따라 단일 일자 또는 시험 범위(시작~종료)를 설정해요.' },
  { num: 2, label: '가용시간',  icon: Clock,     title: '학습 가능 시간',       description: '평일·주말 학습할 수 있는 시간대. 학교/학원 시간 빼고.' },
  { num: 3, label: '범위',      icon: BookOpen,  title: '학습 범위',            description: '이번 시험에서 다룰 과목 · 단원 선택. 시간 분배는 AI가 단원 수·약점·D-day로 자동 계산해요.' },
  { num: 4, label: '블록',      icon: Hourglass, title: '블록 패턴',            description: '집중 ↔ 휴식 리듬. 본인 집중력에 맞춰 선택.' },
  { num: 5, label: '약점',      icon: Flame,     title: '약점 자동 반영',       description: '풀림 분석의 약점 단원을 플래너가 자동으로 더 많이 배정할지.' },
  { num: 6, label: '동기',      icon: Heart,     title: '동기 부여 스타일',     description: '봇이 어떻게 너를 도울지. 스파르타로 갈수록 알림이 늘어요.' },
  { num: 7, label: '알림',      icon: Bell,      title: '리마인더',             description: '카톡·푸시·시작 5분 전 알림. 부모 일일 보고는 동의 필요.' },
  { num: 8, label: '활성화',    icon: Sparkles,  title: '미리보기 · 활성화',    description: '일주일 자동 생성된 플래너를 확인하고 활성화.' },
] as const;
