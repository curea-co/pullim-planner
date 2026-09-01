/**
 * 시험 일자 캡션 포맷 — STEP1 카운트다운 블록이 D-day 수치 아래 깔아 주는 사람이 읽는 한 줄.
 *
 * `timeZone: 'UTC'` 고정 — `daysBetween` 이 `${iso}T00:00:00Z` 로 파싱하므로 기준을 맞추지
 * 않으면 KST 밖(예: UTC-5)에서 D-day 수치와 요일이 하루 어긋난다.
 */

/** `dateStyle` 과 `weekday` 를 같이 넘기면 Intl 이 TypeError 를 던진다 — 개별 컴포넌트로만 지정한다. */
const FULL = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

const MONTH_DAY = new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', month: 'long', day: 'numeric' });
const WEEKDAY_SHORT = new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', weekday: 'short' });

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** `2026-09-02` → `2026년 9월 2일 수요일` */
export function formatKoDate(iso: string): string {
  return FULL.format(utcDate(iso));
}

/** `2026-10-12`,`2026-10-16` → `10월 12일 월 → 10월 16일 금` — 연도는 뺀다(한 줄 캡션이라 길이가 비용) */
export function formatKoRange(startIso: string, endIso: string): string {
  const label = (iso: string) => {
    const d = utcDate(iso);
    return `${MONTH_DAY.format(d)} ${WEEKDAY_SHORT.format(d)}`;
  };
  return `${label(startIso)} → ${label(endIso)}`;
}
