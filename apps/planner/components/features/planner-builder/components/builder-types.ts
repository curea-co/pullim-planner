import {
  Target, Clock, BookOpen, Hourglass, Flame, Heart, Bell, Sparkles, Repeat2,
  Timer, Waves, Leaf, HandHeart,
  type LucideIcon,
} from 'lucide-react';
import type { SubjectKey } from '@/lib/mock';
import { ROUTINE_ENABLED, WEAKNESS_ENABLED } from '@/lib/flags';

/**
 * 학생 플래너 빌더 9단계 폼 데이터.
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
  targetGrade: string;         // 모의·수능 — 자유 입력 (예: "1등급"). 5등급 체제 대응
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

export type StepKey =
  | 'goal' | 'hours' | 'subjects' | 'pattern' | 'routine'
  | 'weakness' | 'motivation' | 'reminder' | 'activate';

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
    targetGrade: p.target.kind === 'grade' ? `${p.target.value}등급` : '',
    targetScore: p.target.kind === 'score' ? Number(p.target.value) : 90,
    targetGoal: p.target.kind === 'free' ? String(p.target.value) : '',
    motto: p.motto,
    weekdayHours: { ...p.weekdayHours },
    weekendHours: { ...p.weekendHours },
    subjectUnits: { ...p.subjectUnits },
    blockPattern: p.blockPattern,
    // 루틴 적용은 Planner 메타에 미보존(실 BE 연기) — 편집 진입 시 빈 선택으로 시작
    routineIds: [],
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

// 루틴 단계는 게이트(ROUTINE_ENABLED) off면 제외 — prod에서 미출시 단계/CTA dead-end 방지.
const allSteps: readonly Omit<StepInfo, 'num'>[] = [
  { key: 'goal',       label: '목표',      icon: Target,    title: '목표 · D-day',         description: '' },
  { key: 'hours',      label: '가용시간',  icon: Clock,     title: '학습 가능 시간',       description: '평일·주말 학습할 수 있는 시간대. 학교/학원 시간 빼고.' },
  { key: 'subjects',   label: '범위',      icon: BookOpen,  title: '학습 범위',            description: '이번 시험에서 다룰 과목 · 단원 선택. 시간 분배는 AI가 단원 수·약점·D-day로 자동 계산해요.' },
  { key: 'pattern',    label: '블록',      icon: Hourglass, title: '블록 패턴',            description: '집중 ↔ 휴식 리듬. 본인 집중력에 맞춰 선택.' },
  { key: 'routine',    label: '루틴',      icon: Repeat2,   title: '루틴 — 반복하는 행동', description: '매일·매주 반복할 행동을 골라 이 시간표에 넣어요. 건너뛰어도 돼요.' },
  { key: 'weakness',   label: '약점',      icon: Flame,     title: '약점 자동 반영',
    description: WEAKNESS_ENABLED
      ? '풀림 분석의 약점 단원을 플래너가 자동으로 더 많이 배정할지.'
      : '풀림 분석의 약점 단원을 자동 배정하는 기능 — 지금 준비 중이에요.' },
  { key: 'motivation', label: '동기',      icon: Heart,     title: '동기 부여 스타일',     description: '봇이 어떻게 너를 도울지. 스파르타로 갈수록 알림이 늘어요.' },
  { key: 'reminder',   label: '알림',      icon: Bell,      title: '리마인더',             description: '카톡·푸시·시작 5분 전 알림. 부모 일일 보고는 동의 필요.' },
  { key: 'activate',   label: '활성화',    icon: Sparkles,  title: '미리보기 · 활성화',    description: '일주일 자동 생성된 플래너를 확인하고 활성화.' },
];

export const plannerStepConfig: readonly StepInfo[] = allSteps
  .filter(s => s.key !== 'routine' || ROUTINE_ENABLED)
  .map((s, i) => ({ ...s, num: i + 1 }));
