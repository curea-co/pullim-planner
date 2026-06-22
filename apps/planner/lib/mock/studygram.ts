/**
 * 공유(Study-gram) mock 데이터
 * spec §6 — 친구 3~5건, 인증카드 5건, 세팅 1건.
 */

import type { StudyProof, StudygramSetting, Friend } from '@/components/features/studygram/types';

export const mockStudygramSetting: StudygramSetting = {
  topicLine: '2027 수능 국어·영어 매일 2시간',
  tonePresetId: 'classic',
  goalHorizonDays: 100,
  goalPostsPerDay: 1,
  consentGiven: true,
};

export const mockStudyProofs: StudyProof[] = [
  {
    id: 'proof-001',
    userId: 'dev-local',
    date: '2026-06-22',
    snapshot: {
      completedBlocks: 5,
      totalBlocks: 6,
      studyMinutes: 127,
      accuracy: 82,
      condition: 4,
      reflectionLine: '영어 독해 오답 원인 파악. 내일 어법 집중.',
      subjectTags: ['영어', '국어'],
    },
    tonePresetId: 'classic',
    caption: '오늘도 무사히 🔥 D-78',
    visibility: 'close_friends',
    createdAt: '2026-06-22T22:10:00Z',
    reactionCount: 3,
  },
  {
    id: 'proof-002',
    userId: 'dev-local',
    date: '2026-06-21',
    snapshot: {
      completedBlocks: 4,
      totalBlocks: 5,
      studyMinutes: 110,
      accuracy: 76,
      condition: 3,
      reflectionLine: '수학 미적분 개념 정리 완료. 문제 풀이는 내일.',
      subjectTags: ['수학'],
    },
    tonePresetId: 'classic',
    caption: '미적분 개념 드디어 끝냄',
    visibility: 'close_friends',
    createdAt: '2026-06-21T21:45:00Z',
    reactionCount: 1,
  },
  {
    id: 'proof-003',
    userId: 'dev-local',
    date: '2026-06-20',
    snapshot: {
      completedBlocks: 6,
      totalBlocks: 6,
      studyMinutes: 142,
      accuracy: 91,
      condition: 5,
      reflectionLine: '국어 모의고사 1등급! 비문학이 드디어 잡힌다.',
      subjectTags: ['국어'],
    },
    tonePresetId: 'classic',
    caption: '국어 1등급 🎯 감격',
    visibility: 'close_friends',
    createdAt: '2026-06-20T22:30:00Z',
    reactionCount: 7,
  },
  {
    id: 'proof-004',
    userId: 'dev-local',
    date: '2026-06-19',
    snapshot: {
      completedBlocks: 3,
      totalBlocks: 5,
      studyMinutes: 75,
      condition: 2,
      reflectionLine: '컨디션 나빠서 절반만. 내일 따라잡자.',
      subjectTags: ['영어'],
    },
    tonePresetId: 'classic',
    caption: '힘든 날도 기록',
    visibility: 'close_friends',
    createdAt: '2026-06-19T20:00:00Z',
    reactionCount: 5,
  },
  {
    id: 'proof-005',
    userId: 'dev-local',
    date: '2026-06-18',
    snapshot: {
      completedBlocks: 5,
      totalBlocks: 5,
      studyMinutes: 130,
      accuracy: 88,
      condition: 4,
      reflectionLine: '사탐 윤사 암기 집중. 오답 2개만 남음.',
      subjectTags: ['사탐', '윤사'],
    },
    tonePresetId: 'classic',
    caption: '윤사 거의 다 됐다',
    visibility: 'friends',
    createdAt: '2026-06-18T22:00:00Z',
    reactionCount: 2,
  },
];

export const mockFriends: Friend[] = [
  {
    id: 'friend-001',
    userId: 'user-j',
    name: '지수',
    grade: '고3',
    isCloseFriend: true,
    status: 'accepted',
    proofCount: 22,
    latestProofDate: '2026-06-22',
  },
  {
    id: 'friend-002',
    userId: 'user-m',
    name: '민준',
    grade: '고3',
    isCloseFriend: true,
    status: 'accepted',
    proofCount: 18,
    latestProofDate: '2026-06-21',
  },
  {
    id: 'friend-003',
    userId: 'user-s',
    name: '서연',
    grade: '고2',
    isCloseFriend: false,
    status: 'accepted',
    proofCount: 11,
    latestProofDate: '2026-06-20',
  },
  {
    id: 'friend-004',
    userId: 'user-h',
    name: '현우',
    grade: '고3',
    isCloseFriend: false,
    status: 'pending',
    proofCount: 0,
  },
];

/** 친구 중 수락된 close-friends 피드용 인증카드 샘플 */
export const mockFriendProofs: StudyProof[] = [
  {
    id: 'friend-proof-001',
    userId: 'user-j',
    date: '2026-06-22',
    snapshot: {
      completedBlocks: 4,
      totalBlocks: 4,
      studyMinutes: 98,
      accuracy: 79,
      condition: 4,
      reflectionLine: '화학 반응식 드디어 외웠다!',
      subjectTags: ['화학'],
    },
    tonePresetId: 'calm',
    caption: '화학 완파 🧪',
    visibility: 'close_friends',
    createdAt: '2026-06-22T21:30:00Z',
    reactionCount: 2,
  },
  {
    id: 'friend-proof-002',
    userId: 'user-m',
    date: '2026-06-21',
    snapshot: {
      completedBlocks: 5,
      totalBlocks: 6,
      studyMinutes: 115,
      condition: 3,
      reflectionLine: '수학 킬러문항 아직 어렵다. 포기 안 함.',
      subjectTags: ['수학'],
    },
    tonePresetId: 'minimal',
    caption: '꾸준히 가자',
    visibility: 'close_friends',
    createdAt: '2026-06-21T22:00:00Z',
    reactionCount: 4,
  },
];

/** 오늘(2026-06-22) 이미 인증했는지 여부 */
export function hasTodayProof(proofs: StudyProof[], today = '2026-06-22'): boolean {
  return proofs.some((p) => p.date === today);
}

/** 목표 진행 계산 */
export function calcGoalProgress(
  proofs: StudyProof[],
  setting: StudygramSetting,
  today = '2026-06-22',
): { posted: number; goalTotal: number; remainDays: number; streakDays: number } {
  const goalTotal = setting.goalHorizonDays * setting.goalPostsPerDay;
  const posted = proofs.length;

  const startDate = new Date('2026-05-14'); // mock 시작일
  const todayDate = new Date(today);
  const remainDays = Math.max(
    0,
    setting.goalHorizonDays - Math.floor((todayDate.getTime() - startDate.getTime()) / 86400000),
  );

  // 연속 인증일 계산 (날짜 정렬 기준 역순)
  const sortedDates = [...new Set(proofs.map((p) => p.date))].sort().reverse();
  let streakDays = 0;
  let cursor = new Date(today);
  for (const d of sortedDates) {
    const proofDate = new Date(d);
    const diff = Math.round((cursor.getTime() - proofDate.getTime()) / 86400000);
    if (diff <= 1) {
      streakDays++;
      cursor = proofDate;
    } else {
      break;
    }
  }

  return { posted, goalTotal, remainDays, streakDays };
}
