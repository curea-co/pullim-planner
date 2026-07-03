/**
 * 홈 실데이터 어댑터·집계(B4) — pullim-api 블록 응답을 홈 뷰가 소비하는 mock shape
 * (`TimeBlock`·`WeekDay`·`MonthDay`)으로 변환한다. 순수함수(테스트 대상) — fetch 는
 * `use-home-blocks` 훅, 소비는 HomeContainer.
 */

import type { PullimBlock } from '@pullim-planner/api-client';
import type {
  BlockType, MonthDay, PedagogyEngineId, SubjectKey, TimeBlock, WeekDay,
} from '@/lib/mock';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

/** 오늘(KST) `YYYY-MM-DD`. */
export function todayKstIso(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function isoToUtcMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcMsToIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** 기준일에서 ±N일 이동한 `YYYY-MM-DD`. */
export function shiftIsoDate(baseIso: string, days: number): string {
  return utcMsToIso(isoToUtcMs(baseIso) + days * DAY_MS);
}

/** 요일 인덱스(월=0..일=6) — UTC 산술이라 타임존 무관. */
function weekdayMon0(iso: string): number {
  return (new Date(isoToUtcMs(iso)).getUTCDay() + 6) % 7;
}

/** offset 주(0=이번 주)의 월~일 7일 날짜 목록. */
export function weekDatesFor(todayIso: string, weekOffset: number): string[] {
  const monday = shiftIsoDate(todayIso, -weekdayMon0(todayIso) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => shiftIsoDate(monday, i));
}

/** offset 월(0=이번 달)의 1일~말일 날짜 목록. */
export function monthDatesFor(todayIso: string, monthOffset: number): string[] {
  const [y, m] = todayIso.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + monthOffset, 1));
  const daysInMonth = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, i) =>
    utcMsToIso(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), i + 1)),
  );
}

/** `YYYY-MM-DD` → "M월" 라벨(월간 헤더용). */
export function monthLabelOf(iso: string): string {
  return `${Number(iso.split('-')[1])}월`;
}

/**
 * pullim-api 블록(`PullimBlock`) → 홈 뷰 `TimeBlock`.
 * subject/type/engines 는 BE 가 FE enum 집합으로 발급(생성 엔진·루틴 검증)하므로 단언.
 * 완료 메타(completed) → status 보정: BE status 가 'todo' 여도 완료 기록이 있으면 done 취급.
 */
export function pullimToTimeBlock(b: PullimBlock): TimeBlock {
  return {
    id: b.id,
    start: b.start,
    end: b.end,
    subject: b.subject as SubjectKey,
    type: b.type as BlockType,
    title: b.title,
    linkedFeatureSlug: b.linkedFeatureSlug ?? undefined,
    curriculumNodeId: b.curriculumNodeId ?? undefined,
    engines: b.engines as PedagogyEngineId[],
    progress: b.completed ? 1 : b.progress,
    status: b.completed ? 'done' : (b.status as TimeBlock['status']),
    expectedMinutes: b.expectedMinutes,
    accuracy: b.accuracy,
    emotion: b.emotion as TimeBlock['emotion'],
    reasoning: b.reasoning ?? undefined,
  };
}

function minutesOf(block: TimeBlock): number {
  return block.expectedMinutes;
}

/** 날짜별 블록 → 주간 `WeekDay[]`(week-grid·school/heatmap 레이아웃 shape). */
export function buildWeekDays(
  weekDates: string[],
  blocksByDate: Record<string, TimeBlock[]>,
  todayIso: string,
): WeekDay[] {
  return weekDates.map((date, i) => {
    const blocks = blocksByDate[date] ?? [];
    const byType = new Map<BlockType, { count: number; minutes: number }>();
    let total = 0;
    let doneMinutes = 0;
    for (const b of blocks) {
      if (b.type === 'break') continue;
      const acc = byType.get(b.type) ?? { count: 0, minutes: 0 };
      acc.count += 1;
      acc.minutes += minutesOf(b);
      byType.set(b.type, acc);
      total += minutesOf(b);
      if (b.status === 'done') doneMinutes += minutesOf(b);
    }
    return {
      day: WEEKDAY_LABELS[i],
      date: Number(date.split('-')[2]),
      isToday: date === todayIso,
      blocks: [...byType.entries()].map(([type, v]) => ({ type, ...v })),
      totalMinutes: total,
      completionPct: total === 0 ? 0 : Math.round((doneMinutes / total) * 100),
    };
  });
}

/** 날짜별 블록 → 월간 `MonthDay[]`(month-heatmap shape). 시험일엔 마일스톤 깃발. */
export function buildMonthDays(
  monthDates: string[],
  blocksByDate: Record<string, TimeBlock[]>,
  todayIso: string,
  exam?: { startDate: string; label: string },
): MonthDay[] {
  return monthDates.map((date) => {
    const blocks = (blocksByDate[date] ?? []).filter((b) => b.type !== 'break');
    const done = blocks.filter((b) => b.status === 'done').length;
    const isExam = exam !== undefined && date === exam.startDate;
    return {
      date: Number(date.split('-')[2]),
      weekday: WEEKDAY_LABELS[weekdayMon0(date)],
      blockCount: blocks.length,
      completionPct:
        blocks.length === 0 ? 0 : Math.round((done / blocks.length) * 100),
      isToday: date === todayIso,
      isFuture: date > todayIso,
      ...(isExam
        ? {
            hasExamMilestone: true,
            examMilestone: { label: exam.label, importance: 'high' as const },
          }
        : {}),
    };
  });
}

/** 주간 `WeekDay[]` → 요일별 학습 시간(bar-week·주간 메타용). */
export function weekDaysToHours(
  days: WeekDay[],
): { day: string; hours: number; goal: number }[] {
  return days.map((d) => ({
    day: d.day,
    hours: Math.round((d.totalMinutes / 60) * 10) / 10,
    // 실데이터 목표(goal)는 별도 표면 미보유 — 계획 시간 자체를 목표로 둔다(B4b 에서 목표 표면 연동).
    goal: Math.round((d.totalMinutes / 60) * 10) / 10,
  }));
}

/** 시험일까지 D-day(달력일 기준, 오늘=0·미래=양수). */
export function ddayFrom(todayIso: string, examIso: string): number {
  return Math.round((isoToUtcMs(examIso) - isoToUtcMs(todayIso)) / DAY_MS);
}
