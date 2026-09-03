/**
 * 홈 실데이터 어댑터·집계(B4) — pullim-api 블록 응답을 홈 뷰가 소비하는 mock shape
 * (`TimeBlock`·`WeekDay`·`MonthDay`)으로 변환한다. 순수함수(테스트 대상) — fetch 는
 * `use-home-blocks` 훅, 소비는 HomeContainer.
 */

import type { PullimBlock } from '@/lib/api-client';
import { blockTypeMeta, pedagogyEngineMeta, subjectLabels } from '@/lib/mock';
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


/* ─── BE 값 → FE enum 정규화 ────────────────────────────────────────
 * `PullimBlock` 의 subject·type·status·engines 는 계약상 전부 `string`/`string[]` 이다
 * (lib/api-client/pullim-planner.ts). FE 는 이 값들을 닫힌 enum 으로 보고 곳곳에서
 * `Record<BlockType, …>` 로 조회한다. 예전에는 `as` 로 단언만 해서, BE 가 FE 가 모르는
 * 값을 하나만 보내도 조회 결과가 undefined 가 되고 `meta.Icon` 에서 페이지가 통째로
 * 죽었다(#231 후속). 이 앱에는 error.tsx 가 없어 그 에러가 곧장 흰 화면이 된다.
 *
 * 그래서 경계에서 **아는 값만 통과**시킨다. 모르는 값은 버리거나 안전한 기본값으로 접고,
 * 조용히 사라지지 않게 값마다 한 번씩 경고한다(같은 값 반복 로그 방지).
 */
const KNOWN_TYPES = new Set(Object.keys(blockTypeMeta));
const KNOWN_ENGINES = new Set(Object.keys(pedagogyEngineMeta));
const KNOWN_SUBJECTS = new Set(Object.keys(subjectLabels));
const KNOWN_STATUSES = new Set<TimeBlock['status']>(['todo', 'doing', 'done', 'skipped']);

const warned = new Set<string>();
function warnOnce(field: string, value: string): void {
  const key = `${field}:${value}`;
  if (warned.has(key)) return;
  warned.add(key);
  // 계약 위반이지만 사용자 흐름은 계속돼야 한다 — 화면은 접고 개발자에게만 알린다.
  console.warn(`[planner] pullim-api 가 모르는 ${field} 값을 보냈다: ${value}`);
}

function normType(v: string): BlockType {
  if (KNOWN_TYPES.has(v)) return v as BlockType;
  warnOnce('block.type', v);
  return 'concept';
}
function normSubject(v: string): SubjectKey {
  if (KNOWN_SUBJECTS.has(v)) return v as SubjectKey;
  warnOnce('block.subject', v);
  return 'etc';
}
function normStatus(v: string): TimeBlock['status'] {
  if (KNOWN_STATUSES.has(v as TimeBlock['status'])) return v as TimeBlock['status'];
  warnOnce('block.status', v);
  return 'todo';
}
/** 모르는 엔진은 버린다 — 태그 하나가 빠질 뿐, 접어도 잃는 정보가 없다. */
function normEngines(v: string[] | undefined): PedagogyEngineId[] {
  if (!Array.isArray(v)) return [];
  return v.filter((e) => {
    if (KNOWN_ENGINES.has(e)) return true;
    warnOnce('block.engines[]', e);
    return false;
  }) as PedagogyEngineId[];
}

/**
 * pullim-api 블록(`PullimBlock`) → 홈 뷰 `TimeBlock`.
 * subject/type/status/engines 는 계약이 `string` 이라 위 norm* 로 **검증해서** 넣는다.
 * (예전 주석은 "BE 가 FE enum 으로 발급하므로 단언"이었는데, 그 보장은 타입에 없다.)
 * 완료 메타(completed) → status 보정: BE status 가 'todo' 여도 완료 기록이 있으면 done 취급.
 */
export function pullimToTimeBlock(b: PullimBlock): TimeBlock {
  return {
    id: b.id,
    start: b.start,
    end: b.end,
    subject: normSubject(b.subject),
    type: normType(b.type),
    title: b.title,
    linkedFeatureSlug: b.linkedFeatureSlug ?? undefined,
    curriculumNodeId: b.curriculumNodeId ?? undefined,
    engines: normEngines(b.engines),
    progress: b.completed ? 1 : b.progress,
    status: b.completed ? 'done' : normStatus(b.status),
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
      dayOffset: ddayFrom(todayIso, date), // 일간 뷰 딥링크용(오늘 대비 일 수)
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
      dayOffset: ddayFrom(todayIso, date), // 일간 뷰 딥링크용(오늘 대비 일 수)
      ...(isExam
        ? {
            hasExamMilestone: true,
            examMilestone: { label: exam.label, importance: 'high' as const },
          }
        : {}),
    };
  });
}

/**
 * 주간 `WeekDay[]` → 요일별 계획 시간(bar-week 실데이터용).
 * 목표(goal)는 실 표면 미보유라 **반환하지 않는다** — 소비자(bar-week)가 목표 기반 UI
 * (목표선·달성률·달성색)를 숨긴다(실적/실적=항상 100% 오도 방지, B4b 에서 목표 표면 연동).
 */
export function weekDaysToHours(
  days: WeekDay[],
): { day: string; hours: number }[] {
  return days.map((d) => ({
    day: d.day,
    hours: Math.round((d.totalMinutes / 60) * 10) / 10,
  }));
}

/** 시험일까지 D-day(달력일 기준, 오늘=0·미래=양수). */
export function ddayFrom(todayIso: string, examIso: string): number {
  return Math.round((isoToUtcMs(examIso) - isoToUtcMs(todayIso)) / DAY_MS);
}
