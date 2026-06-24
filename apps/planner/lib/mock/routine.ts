/**
 * 루틴(반복 행동) 라이브러리 — mock store.
 *
 * 핵심 개념(2026-06-24 spec): 루틴 = 사용자 단위 **재사용 가능한 반복 행동** 라이브러리.
 * "새 시간표 만들기" 9단계 위저드 5단계에서 골라 적용한다.
 * 실 BE(연기 트랙)는 pullim-api routines 엔드포인트로 대체 — 그 전까지 이 mutable store가 권위.
 *
 * 요일은 FE 친화적으로 0=월 … 6=일 배열. BE 비트마스크 변환은 api-client 경계에서(연기).
 */

import type { SubjectKey } from './persona';
import type { BlockType } from './planner';

/** 0=월 … 6=일 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;
export const WEEKDAY_ORDER: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export type Routine = {
  id: string;
  /** 반복 행동 이름 — 예: "아침 영단어" */
  title: string;
  subject: SubjectKey;
  type: BlockType;
  /** "HH:MM" */
  startTime: string;
  endTime: string;
  /** 반복 요일 (0=월 … 6=일), 오름차순 */
  weekdays: Weekday[];
};

/** "HH:MM" 두 시각의 분 차이. */
export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

/** 반복 요일 라벨 — "매일" / "주중" / "주말" / "월·수·금" */
export function formatWeekdays(weekdays: Weekday[]): string {
  const set = [...weekdays].sort((a, b) => a - b);
  if (set.length === 7) return '매일';
  if (set.length === 5 && set.every((d, i) => d === i)) return '주중';
  if (set.length === 2 && set[0] === 5 && set[1] === 6) return '주말';
  return set.map((d) => WEEKDAY_LABELS[d]).join('·');
}

function buildInitialRoutines(): Routine[] {
  return [
    {
      id: 'routine_001', title: '아침 영단어',
      subject: 'english', type: 'memorize',
      startTime: '07:30', endTime: '08:00',
      weekdays: [0, 1, 2, 3, 4, 5],
    },
    {
      id: 'routine_002', title: '저녁 수학 인강',
      subject: 'math', type: 'concept',
      startTime: '19:00', endTime: '19:50',
      weekdays: [0, 1, 2, 3, 4],
    },
    {
      id: 'routine_003', title: '주말 모의고사',
      subject: 'math', type: 'mock',
      startTime: '10:00', endTime: '11:40',
      weekdays: [6],
    },
  ];
}

export const mockRoutines: Routine[] = buildInitialRoutines();

/** 개발자 도구(DevReset) 전용 — 초기 시드로 되돌림. */
export function resetMockRoutines(): void {
  mockRoutines.length = 0;
  for (const r of buildInitialRoutines()) mockRoutines.push(r);
}

export function getRoutines(): Routine[] {
  return mockRoutines;
}

export function findRoutine(id: string): Routine | undefined {
  return mockRoutines.find((r) => r.id === id);
}

export function addRoutine(input: Omit<Routine, 'id'>): Routine {
  const routine: Routine = { ...input, id: `routine_${Date.now()}` };
  mockRoutines.push(routine);
  return routine;
}

export function updateRoutine(
  id: string,
  patch: Partial<Omit<Routine, 'id'>>,
): Routine | undefined {
  const routine = mockRoutines.find((r) => r.id === id);
  if (!routine) return undefined;
  Object.assign(routine, patch);
  return routine;
}

export function removeRoutine(id: string): void {
  const idx = mockRoutines.findIndex((r) => r.id === id);
  if (idx >= 0) mockRoutines.splice(idx, 1);
}
