import { mapServerPreview } from '@/lib/planner/preview-map';
import type { PullimPreviewBlock } from '@/lib/api-client';

const TODAY = '2026-08-03'; // 월요일

function block(over: Partial<PullimPreviewBlock> = {}): PullimPreviewBlock {
  return {
    date: TODAY,
    startTime: '18:00',
    endTime: '18:50',
    subject: 'english',
    type: 'practice',
    title: '영어 · 독해 — 문제 풀이',
    expectedMinutes: 50,
    source: 'generated',
    routineId: null,
    ...over,
  };
}

describe('mapServerPreview (서버 dry-run → 미리보기 카드)', () => {
  it('날짜별로 묶고 title에서 단원을 파싱한다 — 오늘은 offset 0', () => {
    const days = mapServerPreview(
      [
        block(),
        block({ date: '2026-08-04', startTime: '19:00', endTime: '19:50' }),
      ],
      TODAY,
      '2026-08-20',
      '2026-08-20',
    );
    expect(days).toHaveLength(7); // 시험이 멀면 7일 창 전체
    expect(days[0]).toMatchObject({ offset: 0, monthDay: '8/3', weekdayLabel: '월' });
    expect(days[0].items[0]).toMatchObject({
      start: '18:00', end: '18:50', subjectLabel: '영어', unitLabel: '독해', type: 'practice',
    });
    expect(days[1].items).toHaveLength(1);
    expect(days[2].items).toHaveLength(0); // 블록 없는 날도 카드 유지
  });

  it('루틴 블록은 title 그대로 + isRoutine, DB time(HH:MM:SS)도 HH:MM 정규화', () => {
    const days = mapServerPreview(
      [block({ source: 'routine', routineId: 'rt-1', title: '아침 영단어', startTime: '07:00:00', endTime: '07:30:00', subject: 'english', type: 'memorize' })],
      TODAY,
      '2026-08-20',
      '2026-08-20',
    );
    expect(days[0].items[0]).toMatchObject({
      start: '07:00', end: '07:30', unitLabel: '아침 영단어', isRoutine: true,
    });
  });

  it('시험 기간은 isExamDay, 종료일 이후 카드는 만들지 않는다', () => {
    const days = mapServerPreview([block()], TODAY, '2026-08-05', '2026-08-06');
    expect(days).toHaveLength(4); // 08-03~08-06
    expect(days.map((d) => d.isExamDay)).toEqual([false, false, true, true]);
  });

  it('단원 없는 title(모의 등)은 unitLabel 빈 문자열', () => {
    const days = mapServerPreview(
      [block({ title: '영어 — 모의고사 실전', type: 'mock' })],
      TODAY,
      '2026-08-20',
      '2026-08-20',
    );
    expect(days[0].items[0].unitLabel).toBe('');
  });
});
