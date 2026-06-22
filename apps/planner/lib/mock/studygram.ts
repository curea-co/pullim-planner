/**
 * 공유(Study-gram) mock 데이터
 * spec §6 — 친구 3~5건, 인증카드 5건, 세팅 1건.
 *
 * 데이터 타입 정의도 여기에 위치 (components/features → lib 의존 방향 유지).
 * Phase P0 완료 후 packages/types로 이전 예정.
 */

export type TonePresetId = 'fancy' | 'calm' | 'classic' | 'minimal' | 'soft';

export type Visibility = 'close_friends' | 'friends' | 'private';

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export type ProofSnapshot = {
  completedBlocks: number;
  totalBlocks: number;
  studyMinutes: number;
  accuracy?: number;
  condition: 1 | 2 | 3 | 4 | 5;
  reflectionLine: string;
  subjectTags: string[];
};

export type StudyProof = {
  id: string;
  userId: string;
  date: string;             // YYYY-MM-DD
  snapshot: ProofSnapshot;
  tonePresetId: TonePresetId;
  caption: string;
  visibility: Visibility;
  createdAt: string;
  reactionCount: number;
};

export type StudygramSetting = {
  topicLine: string;
  tonePresetId: TonePresetId;
  goalHorizonDays: number;
  goalPostsPerDay: number;
  consentGiven: boolean;
};

export type Friend = {
  id: string;
  userId: string;
  name: string;
  grade: string;
  isCloseFriend: boolean;
  status: FriendshipStatus;
  proofCount: number;
  latestProofDate?: string;
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 한국 시간(Asia/Seoul, 고정 UTC+9·DST 없음) 기준 오늘 YYYY-MM-DD.
 * UTC 자정 직후(KST 00:00~08:59)에 '어제'로 밀리는 경계 오류를 막는다.
 */
export function todayKST(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * KST 오늘 기준 N일 전 YYYY-MM-DD.
 * mock 인증카드 날짜를 항상 '최근'으로 유지해, 어느 날 열어도 오늘 인증·연속일이 동작하도록.
 */
function daysAgo(n: number): string {
  return new Date(Date.now() + KST_OFFSET_MS - n * 86400000).toISOString().slice(0, 10);
}

export const mockStudygramSetting: StudygramSetting = {
  topicLine: '2027 수능 국어·영어 매일 2시간',
  tonePresetId: 'classic',
  goalHorizonDays: 100,
  goalPostsPerDay: 1,
  consentGiven: true,
};

/**
 * 세팅 저장 — BE(api-client) 연동 전까지 공유 mock 상태를 in-place 갱신한다.
 * 세팅 화면 저장 후 공유 허브가 같은 객체를 읽어 변경이 반영된다.
 */
export function saveStudygramSetting(patch: Partial<StudygramSetting>): void {
  Object.assign(mockStudygramSetting, patch);
}

export const mockStudyProofs: StudyProof[] = [
  {
    id: 'proof-001',
    userId: 'dev-local',
    date: daysAgo(0),
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
    date: daysAgo(1),
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
    date: daysAgo(2),
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
    date: daysAgo(3),
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
    date: daysAgo(4),
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
    latestProofDate: daysAgo(0),
  },
  {
    id: 'friend-002',
    userId: 'user-m',
    name: '민준',
    grade: '고3',
    isCloseFriend: true,
    status: 'accepted',
    proofCount: 18,
    latestProofDate: daysAgo(1),
  },
  {
    id: 'friend-003',
    userId: 'user-s',
    name: '서연',
    grade: '고2',
    isCloseFriend: false,
    status: 'accepted',
    proofCount: 11,
    latestProofDate: daysAgo(2),
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
    date: daysAgo(0),
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
    date: daysAgo(1),
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

/** 오늘 이미 인증했는지 여부 */
export function hasTodayProof(
  proofs: StudyProof[],
  today = todayKST(),
): boolean {
  return proofs.some((p) => p.date === today);
}

/** 목표 진행 계산 */
export function calcGoalProgress(
  proofs: StudyProof[],
  setting: StudygramSetting,
  today = todayKST(),
): { posted: number; goalTotal: number; remainDays: number; streakDays: number } {
  const goalTotal = setting.goalHorizonDays * setting.goalPostsPerDay;
  const posted = proofs.length;

  // mock 시작일: 오늘 기준 39일 전 (고정 오프셋)
  const todayDate = new Date(today + 'T00:00:00');
  const startDate = new Date(todayDate.getTime() - 39 * 86400000);
  const remainDays = Math.max(
    0,
    setting.goalHorizonDays - Math.floor((todayDate.getTime() - startDate.getTime()) / 86400000),
  );

  // 연속 인증일 계산 (날짜 정렬 기준 역순)
  const sortedDates = [...new Set(proofs.map((p) => p.date))].sort().reverse();
  let streakDays = 0;
  let cursor = new Date(today + 'T00:00:00');
  for (const d of sortedDates) {
    const proofDate = new Date(d + 'T00:00:00');
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
