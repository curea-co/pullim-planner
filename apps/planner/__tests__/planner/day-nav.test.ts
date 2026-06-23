import { formatDayNavLabel, formatDayTitle } from '@/lib/planner/day-nav';

// 기준일 planBaseDate = 2026-04-24 (실제 달력상 금요일)
describe('day-nav 날짜 라벨', () => {
  describe('formatDayNavLabel', () => {
    it.each([
      [0, '2026.04.24 (금)'],
      [-1, '2026.04.23 (목)'],
      [1, '2026.04.25 (토)'],
    ])('offset %i → %s', (offset, expected) => {
      expect(formatDayNavLabel(offset)).toBe(expected);
    });

    it('월 경계를 넘어가도 정규화된다 (04-24 +6 → 04-30)', () => {
      expect(formatDayNavLabel(6)).toBe('2026.04.30 (목)');
    });
  });

  describe('formatDayTitle', () => {
    it.each([
      [0, '4월 24일 금요일'],
      [-1, '4월 23일 목요일'],
    ])('offset %i → %s', (offset, expected) => {
      expect(formatDayTitle(offset)).toBe(expected);
    });
  });
});
