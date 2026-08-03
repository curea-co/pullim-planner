import { computeBurnoutFromWeek } from '@/lib/planner/burnout';
import type { TimeBlock } from '@/lib/mock';

const TODAY = '2026-08-03';

function block(over: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: `b-${Math.random().toString(36).slice(2, 8)}`,
    start: '18:00',
    end: '18:50',
    subject: 'math',
    type: 'practice',
    title: '테스트 블록',
    engines: [],
    progress: 0,
    status: 'todo',
    expectedMinutes: 50,
    ...over,
  };
}

describe('computeBurnoutFromWeek (실데이터 번아웃 계산)', () => {
  it('집계할 학습 블록이 없으면 null (데이터 부족 상태)', () => {
    expect(computeBurnoutFromWeek({}, TODAY)).toBeNull();
    // 미래 날짜 블록만 있으면 역시 null — 미래를 미완료로 세지 않는다
    expect(
      computeBurnoutFromWeek({ '2026-08-05': [block()] }, TODAY),
    ).toBeNull();
  });

  it('완료율(streak)을 오늘까지의 학습 블록으로 계산하고 휴식 블록은 제외한다', () => {
    const snap = computeBurnoutFromWeek(
      {
        '2026-08-02': [block({ status: 'done' }), block(), block({ type: 'break' })],
        '2026-08-03': [block({ status: 'done' }), block()],
      },
      TODAY,
    );
    const streak = snap!.factors.find((f) => f.id === 'streak')!;
    expect(streak.value).toBe(50); // 완료 2 / 학습 4 (break 제외)
  });

  it('감정 평균은 완료 기록의 emotion으로 계산하고, 기록이 없으면 지표를 제외한다', () => {
    const withEmotion = computeBurnoutFromWeek(
      { [TODAY]: [block({ status: 'done', emotion: 4 }), block({ status: 'done', emotion: 3 })] },
      TODAY,
    );
    expect(withEmotion!.factors.find((f) => f.id === 'emotion')!.value).toBe(3.5);

    const withoutEmotion = computeBurnoutFromWeek(
      { [TODAY]: [block({ status: 'done' }), block()] },
      TODAY,
    );
    expect(withoutEmotion!.factors.some((f) => f.id === 'emotion')).toBe(false);
    // 감정 없으면 점수 = 완료율 단독
    expect(withoutEmotion!.score).toBe(50);
  });

  it('점수는 완료율 0.6 + 감정(100 환산) 0.4 가중 평균', () => {
    const snap = computeBurnoutFromWeek(
      { [TODAY]: [block({ status: 'done', emotion: 5 }), block()] }, // 완료율 50, 감정 5/5
      TODAY,
    );
    expect(snap!.score).toBe(Math.round(50 * 0.6 + 100 * 0.4)); // 70
  });

  it('trend — 최근 3일 완료율이 이전 대비 10%p 넘게 오르면 rising, 떨어지면 falling', () => {
    const rising = computeBurnoutFromWeek(
      {
        '2026-07-28': [block(), block()],                                   // 0%
        '2026-08-01': [block({ status: 'done' }), block({ status: 'done' })], // 100%
        '2026-08-02': [block({ status: 'done' })],
        '2026-08-03': [block({ status: 'done' })],
      },
      TODAY,
    );
    expect(rising!.trend).toBe('rising');

    const falling = computeBurnoutFromWeek(
      {
        '2026-07-28': [block({ status: 'done' }), block({ status: 'done' })],
        '2026-08-01': [block(), block()],
        '2026-08-02': [block()],
        '2026-08-03': [block()],
      },
      TODAY,
    );
    expect(falling!.trend).toBe('falling');
  });
});
