import {
  formatDayNavLabel, formatDayTitle,
  formatWeekNavLabel, formatWeekTitle,
  formatMonthNavLabel, formatMonthTitle, formatMonthShort,
} from '@/lib/planner/day-nav';

// 데모 캘린더: 기준일 2026-04-24 = 목, 그 주 = 월21~일27 (2026.04 · 4주차)
describe('calendar-nav 라벨', () => {
  describe('일 — formatDayNavLabel (데모 앵커 목, weekView 정합)', () => {
    it.each([
      [0, '2026.04.24 (목)'],
      [-1, '2026.04.23 (수)'],
      [1, '2026.04.25 (금)'],
      [6, '2026.04.30 (수)'],
    ])('offset %i → %s', (offset, expected) => {
      expect(formatDayNavLabel(offset)).toBe(expected);
    });
  });

  describe('일 — formatDayTitle', () => {
    it.each([
      [0, '4월 24일 목요일'],
      [-1, '4월 23일 수요일'],
    ])('offset %i → %s', (offset, expected) => {
      expect(formatDayTitle(offset)).toBe(expected);
    });
  });

  describe('주 — formatWeekTitle (월~일 범위)', () => {
    it.each([
      [0, '4월 21일 — 27일'],
      [-1, '4월 14일 — 20일'],
      [1, '4월 28일 — 5월 4일'], // 월 경계 → 끝에 월 표기
    ])('offset %i → %s', (offset, expected) => {
      expect(formatWeekTitle(offset)).toBe(expected);
    });
  });

  describe('주 — formatWeekNavLabel (ISO 월주차: 첫 목요일 포함 주 = 1주차)', () => {
    it.each([
      [-1, '2026.04 · 3주차'],
      [0, '2026.04 · 4주차'],
      [1, '2026.05 · 1주차'], // 4/28~5/4 주 → 목요일(5/1)이 속한 5월 1주차
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
