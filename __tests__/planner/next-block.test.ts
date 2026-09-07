/**
 * 「다음 블록」이 시계를 본다.
 *
 * 종전 `nextActiveBlock` 은 `find(status==='doing') ?? find(status==='todo')` 였다 — 시각을
 * 전혀 보지 않아 **밤 10시에도 아침 9시 블록이** 「다음 블록 · 09:00 에 시작」으로 떠 있었다.
 * 게다가 `'doing'` 은 pullim-api 가 세우지 않는 상태라 첫 `find` 는 실데이터에서 항상 빈손이고,
 * 실질적으로 「그날 첫 미완료 블록」 하나로 굳어 있었다.
 */
import { nowHhMmKst, pickNextBlock } from '@/lib/planner/next-block';
import type { TimeBlock } from '@/lib/mock';

const b = (id: string, start: string, end: string, status: TimeBlock['status'] = 'todo') =>
  ({
    id, start, end, status,
    subject: 'math', type: 'concept', title: id, engines: [], progress: 0, expectedMinutes: 50,
  }) as unknown as TimeBlock;

const DAY = [b('아침', '09:00', '09:50'), b('점심', '13:00', '13:50'), b('저녁', '21:00', '21:50')];

describe('pickNextBlock — 시각 기준', () => {
  it('블록 구간 안이면 그 블록이 진행 중이다', () => {
    expect(pickNextBlock(DAY, '13:20')?.id).toBe('점심');
    expect(pickNextBlock(DAY, '13:00')?.id).toBe('점심'); // start 포함
  });

  it('구간 밖이면 앞으로 올 것 중 가장 이른 것', () => {
    expect(pickNextBlock(DAY, '08:00')?.id).toBe('아침');
    expect(pickNextBlock(DAY, '13:50')?.id).toBe('저녁'); // end 는 제외 — 이미 끝났다
    expect(pickNextBlock(DAY, '20:59')?.id).toBe('저녁');
  });

  it('밤 10시에 아침 블록을 「다음」이라 하지 않는다 — 이 결함 자체', () => {
    expect(pickNextBlock(DAY, '22:00')).toBeUndefined();
  });

  it('완료·건너뜀은 후보가 아니다', () => {
    const day = [b('아침', '09:00', '09:50', 'done'), b('점심', '13:00', '13:50', 'skipped'), b('저녁', '21:00', '21:50')];
    expect(pickNextBlock(day, '08:00')?.id).toBe('저녁');
  });

  it('지나간 미완료 블록도 「다음」이 아니다 — 지나간 것을 다음이라 부르는 게 원래 결함이다', () => {
    expect(pickNextBlock([b('아침', '09:00', '09:50')], '22:00')).toBeUndefined();
  });

  it('배열 순서를 믿지 않는다 — 응답 정렬이 바뀌어도 가장 이른 것', () => {
    const shuffled = [DAY[2], DAY[0], DAY[1]];
    expect(pickNextBlock(shuffled, '08:00')?.id).toBe('아침');
  });

  it('now=null 이면 시각을 보지 않는다 — 오늘이 아닌 날짜의 첫 미완료 블록', () => {
    expect(pickNextBlock(DAY, null)?.id).toBe('아침');
    expect(pickNextBlock([b('아침', '09:00', '09:50', 'done'), ...DAY.slice(1)], null)?.id).toBe('점심');
  });

  it('빈 배열이면 undefined', () => {
    expect(pickNextBlock([], '13:00')).toBeUndefined();
    expect(pickNextBlock([], null)).toBeUndefined();
  });
});

describe('nowHhMmKst', () => {
  it('KST(UTC+9) HH:MM 을 zero-padded 로 낸다 — 블록의 start/end 와 사전순 비교가 성립해야 한다', () => {
    // 2026-09-07T00:30:00Z = KST 09:30
    expect(nowHhMmKst(Date.parse('2026-09-07T00:30:00Z'))).toBe('09:30');
    // 2026-09-07T15:05:00Z = KST 익일 00:05 — 자정 넘김도 형식이 깨지지 않는다
    expect(nowHhMmKst(Date.parse('2026-09-07T15:05:00Z'))).toBe('00:05');
  });

  it('형식이 HH:MM 이라 문자열 비교가 곧 시각 비교다', () => {
    expect(nowHhMmKst(Date.parse('2026-09-07T00:30:00Z')) < '13:00').toBe(true);
    expect(nowHhMmKst(Date.parse('2026-09-07T13:30:00Z')) > '13:00').toBe(true);
  });
});
