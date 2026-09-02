import { formatKoDate, formatKoRange } from '@/lib/planner/exam-date-format';

// STEP1 카운트다운 캡션 — D-day 수치와 같은 UTC 기준으로 읽혀야 한다(daysBetween 과 동일 파싱).
describe('formatKoDate', () => {
  it.each([
    ['2026-09-02', '2026년 9월 2일 수요일'],
    ['2026-11-19', '2026년 11월 19일 목요일'],
    ['2027-01-01', '2027년 1월 1일 금요일'],
  ])('%s → %s', (iso, expected) => {
    expect(formatKoDate(iso)).toBe(expected);
  });
});

describe('formatKoRange', () => {
  it('연도 없이 월·일·요일만 화살표로 잇는다', () => {
    expect(formatKoRange('2026-10-12', '2026-10-16')).toBe('10월 12일 월 → 10월 16일 금');
  });

  it('달을 넘겨도 양쪽 모두 월을 붙인다', () => {
    expect(formatKoRange('2026-04-29', '2026-05-04')).toBe('4월 29일 수 → 5월 4일 월');
  });
});
