/**
 * 캘린더 기간 네비게이션 — offset(0=기준 기간) → 일/주/월 라벨.
 *
 * 데모 캘린더 기준: 기준일 2026-04-24 = **목요일**, 그 주 = 월21~일27 (2026.04 · 4주차).
 * `weekView`/`monthView` mock 데이터와 정합시키기 위해 실제 JS 요일이 아닌
 * **데모 앵커(목)**를 사용한다. 날짜 숫자/월·연 경계는 JS Date로 정규화한다.
 */

import { planBaseDate } from '@/lib/mock';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const BASE_WEEKDAY = 4; // 2026-04-24 = 목 (데모 앵커)

function baseParts(): [number, number, number] {
  const [y, m, d] = planBaseDate.split('-').map(Number);
  return [y, m, d];
}

/** offset일 후 날짜 (월/연 경계 정규화) */
function dayDate(offset: number): Date {
  const [y, m, d] = baseParts();
  return new Date(y, m - 1, d + offset);
}

/** 데모 앵커 기준 요일 — 실제 JS 요일이 아니라 weekView 데이터와 정합 */
function demoWeekday(dayShift: number): string {
  return WEEKDAYS[((BASE_WEEKDAY + dayShift) % 7 + 7) % 7];
}

/* ── 일 ── */

/** "2026.04.24 (목)" — nav 라벨 */
export function formatDayNavLabel(offset: number): string {
  const dt = dayDate(offset);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}.${mm}.${dd} (${demoWeekday(offset)})`;
}

/** "4월 24일 목요일" — 헤더 제목 */
export function formatDayTitle(offset: number): string {
  const dt = dayDate(offset);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 ${demoWeekday(offset)}요일`;
}

/* ── 주 ── (기준 주 월요일 = 기준일 -3일 = 04-21) */

function weekMonday(weekOffset: number): Date {
  const [y, m, d] = baseParts();
  return new Date(y, m - 1, d - 3 + weekOffset * 7);
}

/** "4월 21일 — 27일" (월 다르면 끝에 월 표기) — 헤더 제목 */
export function formatWeekTitle(weekOffset: number): string {
  const mon = weekMonday(weekOffset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const tail = mon.getMonth() === sun.getMonth()
    ? `${sun.getDate()}일`
    : `${sun.getMonth() + 1}월 ${sun.getDate()}일`;
  return `${mon.getMonth() + 1}월 ${mon.getDate()}일 — ${tail}`;
}

/** "2026.04 · 4주차" — 대표일(목요일=월+3)의 월·주차 */
export function formatWeekNavLabel(weekOffset: number): string {
  const thu = weekMonday(weekOffset);
  thu.setDate(thu.getDate() + 3);
  const mm = String(thu.getMonth() + 1).padStart(2, '0');
  const weekOfMonth = Math.ceil(thu.getDate() / 7);
  return `${thu.getFullYear()}.${mm} · ${weekOfMonth}주차`;
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
