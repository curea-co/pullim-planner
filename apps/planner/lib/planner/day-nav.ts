/**
 * day-view 날짜 네비게이션 — offset(0=기준일) → 날짜 라벨 변환.
 * 기준일(`planBaseDate`)에서 ±N일 이동한 날짜를 한국어 라벨로 포맷한다.
 */

import { planBaseDate } from '@/lib/mock';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function dateFromOffset(offset: number): Date {
  const [y, m, d] = planBaseDate.split('-').map(Number);
  // JS Date는 일자 overflow를 자동 정규화 (월/연 경계 안전)
  return new Date(y, m - 1, d + offset);
}

/** "2026.04.24 (목)" — nav 라벨 */
export function formatDayNavLabel(offset: number): string {
  const dt = dateFromOffset(offset);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}.${mm}.${dd} (${WEEKDAYS[dt.getDay()]})`;
}

/** "4월 24일 목요일" — 헤더 제목 */
export function formatDayTitle(offset: number): string {
  const dt = dateFromOffset(offset);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 ${WEEKDAYS[dt.getDay()]}요일`;
}
