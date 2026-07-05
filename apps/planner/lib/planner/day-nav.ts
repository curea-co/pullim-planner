/**
 * 캘린더 기간 네비게이션 — offset(0=기준 기간) → 일/주/월 라벨.
 *
 * 기준일 `planBaseDate`(2026-04-24, 실달력상 **금요일**)에서 ±N 이동한 기간을 포맷한다.
 * 요일·주차는 모두 **실달력 `Date#getDay()`** 기준 — monthView(`makeMonth`, 4/1=수 실달력)·
 * weekView(실주 4/20~4/26) mock 데이터와 정합한다.
 */

import { planBaseDate } from '@/lib/mock';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function baseParts(): [number, number, number] {
  const [y, m, d] = planBaseDate.split('-').map(Number);
  return [y, m, d];
}

/** offset일 후 날짜 (월/연 경계 정규화) */
function dayDate(offset: number): Date {
  const [y, m, d] = baseParts();
  return new Date(y, m - 1, d + offset);
}

/* ── 일 ── */

/** "2026.04.24 (금)" — nav 라벨 */
export function formatDayNavLabel(offset: number): string {
  const dt = dayDate(offset);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}.${mm}.${dd} (${WEEKDAYS[dt.getDay()]})`;
}

/** "4월 24일 금요일" — 헤더 제목 */
export function formatDayTitle(offset: number): string {
  const dt = dayDate(offset);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 ${WEEKDAYS[dt.getDay()]}요일`;
}

/**
 * 기준일(offset 0) 대비 상대 일자 라벨 — 페이저 버튼/aria용.
 * offset 0=오늘, -1=어제, +1=내일, ±2=그제·모레, 그 밖은 날짜로 폴백.
 * (호출부가 prev=offset-1, next=offset+1을 넘기므로 이동해도 라벨이 어긋나지 않음)
 */
export function formatDayRelLabel(offset: number): string {
  switch (offset) {
    case 0:  return '오늘';
    case -1: return '어제';
    case 1:  return '내일';
    case -2: return '그제';
    case 2:  return '모레';
    default: return formatDayNavLabel(offset);
  }
}

/* ── 주 ── (그 주의 실제 월요일 기준) */

function weekMonday(weekOffset: number): Date {
  const base = dayDate(0);
  const mondayDelta = (base.getDay() + 6) % 7; // 월요일까지 거슬러 갈 일수 (월=0 … 일=6)
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() - mondayDelta + weekOffset * 7);
}

/** "4월 20일 — 26일" (월 다르면 끝에 월 표기) — 헤더 제목 */
export function formatWeekTitle(weekOffset: number): string {
  const mon = weekMonday(weekOffset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const tail = mon.getMonth() === sun.getMonth()
    ? `${sun.getDate()}일`
    : `${sun.getMonth() + 1}월 ${sun.getDate()}일`;
  return `${mon.getMonth() + 1}월 ${mon.getDate()}일 — ${tail}`;
}

/**
 * ISO 8601 방식 월 주차 — **1주차 = 그 달의 첫 목요일이 속한 주(월~일)**.
 * 주의 대표일을 목요일로 잡으면 두 달에 걸친 주도 "목요일이 속한 달"로 명확히 귀속된다.
 * `thursday`는 그 주의 목요일이어야 한다.
 */
function isoWeekOfMonth(thursday: Date): number {
  const date = thursday.getDate();
  // thursday와 같은 요일(목)인 그 달의 첫 날짜 — 항상 1..7
  const firstThursdayDate = ((date - 1) % 7) + 1;
  return Math.floor((date - firstThursdayDate) / 7) + 1;
}

/** "2026.04 · 4주차" — 대표일(목요일=월+3)의 월 + ISO 월주차 */
export function formatWeekNavLabel(weekOffset: number): string {
  const thu = weekMonday(weekOffset);
  thu.setDate(thu.getDate() + 3); // 월 + 3 = 그 주 목요일(ISO 대표일)
  const mm = String(thu.getMonth() + 1).padStart(2, '0');
  return `${thu.getFullYear()}.${mm} · ${isoWeekOfMonth(thu)}주차`;
}

/* ── 월 ── */

function monthDate(monthOffset: number): Date {
  const [y, m] = baseParts();
  return new Date(y, m - 1 + monthOffset, 1);
}

/** "2026년 4월" — 헤더 제목 */
export function formatMonthTitle(monthOffset: number): string {
  const dt = monthDate(monthOffset);
  return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월`;
}

/** "2026.04" — nav 라벨 */
export function formatMonthNavLabel(monthOffset: number): string {
  const dt = monthDate(monthOffset);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dt.getFullYear()}.${mm}`;
}

/** "3월" — prev/next 버튼 라벨용 N월 */
export function formatMonthShort(monthOffset: number): string {
  return `${monthDate(monthOffset).getMonth() + 1}월`;
}
