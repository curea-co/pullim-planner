import {
  formatDayNavLabel, formatDayTitle,
  formatWeekNavLabel, formatWeekTitle,
  formatMonthNavLabel, formatMonthTitle, formatMonthShort,
} from '@/lib/planner/day-nav';

// 실달력: 기준일 2026-04-24 = 금요일, 그 주 = 월20~일26 (2026.04 · 4주차)
describe('calendar-nav 라벨 (실달력 getDay 기준)', () => {
  describe('일 — formatDayNavLabel', () => {
    it.each([
      [0, '2026.04.24 (금)'],
      [-1, '2026.04.23 (목)'],
      [1, '2026.04.25 (토)'],
      [6, '2026.04.30 (목)'],
    ])('offset %i → %s', (offset, expected) => {
      expect(formatDayNavLabel(offset)).toBe(expected);
    });
  });

  describe('일 — formatDayTitle', () => {
    it.each([
      [0, '4월 24일 금요일'],
      [-1, '4월 23일 목요일'],
    ])('offset %i → %s', (offset, expected) => {
      expect(formatDayTitle(offset)).toBe(expected);
    });
  });

  describe('주 — formatWeekTitle (월~일 범위)', () => {
    it.each([
      [0, '4월 20일 — 26일'],
      [-1, '4월 13일 — 19일'],
      [1, '4월 27일 — 5월 3일'], // 월 경계 → 끝에 월 표기
    ])('offset %i → %s', (offset, expected) => {
      expect(formatWeekTitle(offset)).toBe(expected);
    });
  });

  describe('주 — formatWeekNavLabel (ISO 월주차: 첫 목요일 포함 주 = 1주차)', () => {
    it.each([
      [-1, '2026.04 · 3주차'],
      [0, '2026.04 · 4주차'],
      [1, '2026.04 · 5주차'], // 4/27~5/3 주 → 목요일(4/30)이 속한 4월 5주차
    ])('offset %i → %s', (offset, expected) => {
      expect(formatWeekNavLabel(offset)).toBe(expected);
    });
  });

  describe('월 — title/navLabel/short', () => {
    it('formatMonthTitle', () => {
      expect(formatMonthTitle(0)).toBe('2026년 4월');
      expect(formatMonthTitle(1)).toBe('2026년 5월');
      expect(formatMonthTitle(-1)).toBe('2026년 3월');
    });
    it('formatMonthNavLabel', () => {
      expect(formatMonthNavLabel(0)).toBe('2026.04');
      expect(formatMonthNavLabel(-2)).toBe('2026.02');
    });
    it('formatMonthShort (prev/next 버튼 라벨)', () => {
      expect(formatMonthShort(-1)).toBe('3월');
      expect(formatMonthShort(1)).toBe('5월');
    });
  });
});
