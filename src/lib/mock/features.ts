/**
 * 풀림 스터디 14개 기능 메타데이터.
 * SKILL.md 3장(라우트 매핑) + 03_풀림_스터디_마스터.md 기준.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Infinity, MessageCircle,
  ScanSearch, Sparkles,
  GraduationCap, CalendarClock, UsersRound, Mic, Repeat,
} from 'lucide-react';

export type FeatureStage = 'core' | 'growth' | 'future';

export type Feature = {
  /** 라우트 슬러그 (`/study/{slug}`) */
  slug: string;
  /** 브랜드명 — 학생 UI에 노출되는 한글명 */
  name: string;
  /** 영문 코드명 — 내부 식별용. UI에 노출 금지 (SKILL.md 4.1) */
  code: string;
  /** 한 줄 설명 */
  tagline: string;
  /** 마스터 문서의 *"한 줄 슬로건"* — 카드 hover/상세 페이지 헤더 */
  slogan: string;
  stage: FeatureStage;
  /** 출시 중요도 (★개수) */
  priority: 1 | 2 | 3;
  icon: LucideIcon;
  /** 학생/교사 양쪽 화면이 있는 기능 */
  hasTeacherView?: boolean;
};

export const features: Feature[] = [
  // ─── Core (5)
  {
    slug: 'infinity', name: '풀림 무한풀기', code: 'Infinity Engine',
    tagline: '적응형 문제 + 모의고사 통합 — 연습/시험 모드 토글',
    slogan: '문제가 떨어지지 않는다. 내 실력에 딱 맞는 문제가 끊임없이 나온다.',
    stage: 'core', priority: 3, icon: Infinity,
  },
  {
    slug: 'analysis', name: '풀림 분석', code: 'Analytics',
    tagline: '능력치(무엇을 잘하나) + 과정(어떻게 푸나) 두 차원',
    slogan: '같은 학생을 두 각도로 본다 — IRT 능력치와 메타인지 과정.',
    stage: 'core', priority: 3, icon: ScanSearch,
  },
  {
    slug: 'review', name: '풀림 복습', code: 'Review',
    tagline: '오답 정복(Leitner) + 전체 기억(망각곡선) 통합',
    slogan: '같은 spaced repetition의 두 진입점을 한 곳에서.',
    stage: 'core', priority: 3, icon: Repeat,
  },
  {
    slug: 'talk', name: '풀림 AI 대화', code: 'AI Dialog',
    tagline: '코치(전체 학습) + 튜터(한 문제) 두 모드',
    slogan: '자기주도 AI 대화의 두 컨텍스트 — 메타 vs 마이크로.',
    stage: 'core', priority: 3, icon: MessageCircle,
  },

  // ─── Growth (5) — 풀림 모의고사는 풀림 무한풀기에 시험 모드로 통합됨
  {
    slug: 'visual', name: '풀림 라이브러리', code: 'Library',
    tagline: '강의·이해를 돕는 시청각 자료를 만들고 모아요',
    slogan: '학생도, 선생님도, 필요한 자료를 즉석에서 만든다.',
    stage: 'growth', priority: 1, icon: Sparkles,
  },
  {
    slug: 'classbot', name: '풀림 클래스봇', code: 'ClassBot',
    tagline: '선생님이 만든 AI 학습 교실에 들어가요',
    slogan: '교사가 만들고 통제하는 AI 학습 교실. 학생은 배우고, 교사는 모든 것을 본다.',
    stage: 'growth', priority: 3, icon: GraduationCap,
    hasTeacherView: true,
  },
  {
    slug: 'planner', name: '풀림 플래너', code: 'Planner',
    tagline: '시험 일정을 입력하면 학습 계획을 짜줘요',
    slogan: '시험 일정만 입력하면, AI가 분 단위로 완벽한 학습 계획을 짠다.',
    stage: 'growth', priority: 3, icon: CalendarClock,
  },

  // ─── Future (3)
  {
    slug: 'room', name: '풀림 스터디룸', code: 'Study Room',
    tagline: 'AI가 설계하는 그룹 스터디에 참여해요',
    slogan: 'AI가 설계하는 그룹 스터디.',
    stage: 'future', priority: 1, icon: UsersRound,
  },
  {
    slug: 'voice', name: '풀림 보이스', code: 'Voice Mode',
    tagline: '듣고 말하면서 공부해요',
    slogan: '듣고 말하면서 공부한다.',
    stage: 'future', priority: 1, icon: Mic,
  },
];

export const featuresByStage = {
  core:   features.filter(f => f.stage === 'core'),
  growth: features.filter(f => f.stage === 'growth'),
  future: features.filter(f => f.stage === 'future'),
};

export const stageLabel: Record<FeatureStage, string> = {
  core:   'Core',
  growth: 'Growth',
  future: 'Future',
};

export const stageDescription: Record<FeatureStage, string> = {
  core:   '출시 필수 — 풀림 스터디의 핵심 5개 기능',
  growth: '성장 견인 — 데이터가 쌓이며 강화되는 6개 기능',
  future: '비전 — 기술 성숙도가 도달하면 출시되는 3개 기능',
};

export function findFeature(slug: string): Feature | undefined {
  return features.find(f => f.slug === slug);
}

/**
 * 기능 slug → 실제 진입 라우트.
 * 풀림 IA 재배치 후 (2026-04-29):
 *   - 풀이 엔진(infinity) + 평가(analysis) + 복습(review) + AI 대화(talk) → /q/*
 *   - 라이브러리(slug=visual) → /library (생성 허브)
 *   - 플래너 → /planner
 *   - 클래스봇 → /classbot
 *   - future stage(room/voice 등) → 학생 홈 (/) — 라우트 미존재
 */
export function getFeatureRoute(slug: string): string {
  switch (slug) {
    case 'infinity':
    case 'exam':       // 모의고사는 무한풀기 시험 모드로 병합됨
      return '/q/infinity/solve';
    case 'planner':
      return '/planner/calendar';
    case 'classbot':
      return '/classbot';
    case 'visual':
      // 슬러그는 호환을 위해 유지, 라우트는 새 라이브러리 허브로
      return '/library';
    // 분석 통합: 인덱스·풀이분석 → /q/analysis
    case 'index':
    case 'xray':
    case 'analysis':
      return '/q/analysis';
    // 복습 통합: 오답정복·기억장치 → /q/review
    case 'conqueror':
    case 'memory':
    case 'review':
      return '/q/review';
    // AI 대화 통합: 튜터·코치 → /q/talk
    case 'tutor':
    case 'coach':
    case 'talk':
      return '/q/talk';
    default: {
      // future stage feature(room, voice 등)는 라우트 미존재 — 학생 홈 fallback
      const f = features.find(x => x.slug === slug);
      if (f && f.stage === 'future') return '/';
      return `/${slug}`;
    }
  }
}
