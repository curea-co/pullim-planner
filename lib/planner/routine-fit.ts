/**
 * 루틴 ↔ 학습 가능 시간 정합 진단.
 *
 * 루틴은 **시간표가 아니라 사용자 단위 라이브러리**다(`GET /planner/routines`). 루틴을
 * 만들 때는 그게 어느 시간표에 얹힐지, 그 시간표의 가용 창이 몇 시부터인지 알 수 없다.
 * 그래서 "07:30 아침 영단어"가 "평일 18–23시" 시간표에 적용되면 조용히 창 밖에 놓인다 —
 * BE `bakeRoutines` 는 가용 창과 무관하게 요일만 맞으면 굽기 때문에 서버도 막아 주지 않는다.
 *
 * 검증할 수 있는 유일한 지점이 **위저드 4단계(확인)** 이라서 진단을 여기 둔다. 순수 함수만
 * 두고(시계·네트워크·mock 접근 없음) 화면은 결과를 렌더하기만 한다.
 */

import type { Routine } from '@/lib/mock';
import type { PlannerForm } from '@/components/features/planner-builder/components/builder-types';

/** 배치 보류 사유 — 숨기지 않고 표기한다(선택한 루틴의 조용한 누락 방지). */
export type HeldReason = '가용 시간 밖' | '가용 시간 걸침' | '루틴 겹침';

/** 하루치 창에 놓인 루틴 한 건 — 분 단위 좌표를 함께 들고 다닌다. */
export type PlacedRoutine = {
  routineId: string;
  title: string;
  /** 분 단위 시작·종료 */
  startMin: number;
  endMin: number;
  start: string;
  end: string;
  held?: HeldReason;
};

export type RoutineFitIssue = {
  routineId: string;
  title: string;
  held: HeldReason;
  /** 루틴의 현재 시각 */
  start: string;
  end: string;
  /** '평일' | '주말' */
  scopeLabel: string;
  /** 어느 창에 걸렸는지 — 조치가 고칠 폼 필드 */
  windowKey: 'weekdayHours' | 'weekendHours';
  /** 그 창의 현재 범위 표기 — "18:00–23:00" */
  windowLabel: string;
  /** 이 루틴을 담으려면 창이 최소 몇 시부터 몇 시까지여야 하는지(시 단위) */
  needStartHour: number;
  needEndHour: number;
};

export function toMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 창에서 점유 구간을 뺀 나머지 — 빈 세그먼트 목록.
 * 자투리 배치·루틴 이동 자리 찾기가 모두 이 위에서 돈다.
 */
export function subtractRanges(win: [number, number], busy: readonly [number, number][]): [number, number][] {
  const sorted = [...busy].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  let cursor = win[0];
  for (const [s, e] of sorted) {
    if (e <= cursor) continue;
    if (s > cursor) out.push([cursor, Math.min(s, win[1])]);
    cursor = Math.max(cursor, e);
    if (cursor >= win[1]) break;
  }
  if (cursor < win[1]) out.push([cursor, win[1]]);
  return out.filter(([s, e]) => e > s);
}

/**
 * 하루치 루틴 배치 + 보류 판정.
 *
 * 보류 사유를 **셋으로 나눈다** — 창을 완전히 벗어난 것(`가용 시간 밖`)과 한쪽 끝만 물린 것
 * (`가용 시간 걸침`)은 학생이 취할 조치가 다르다. 앞의 것은 루틴을 옮기거나 끄면 되지만,
 * 뒤의 것은 창을 조금 넓히는 것으로 해결된다.
 *
 * @param routineDay 0=월 … 6=일 (mock `Routine.weekdays` 와 동일 좌표계)
 */
export function placeRoutinesForDay(
  routines: readonly Routine[],
  routineDay: number,
  winStart: number,
  winEnd: number,
): PlacedRoutine[] {
  const out: PlacedRoutine[] = [];
  for (const r of routines) {
    if (!r.weekdays.some(w => w === routineDay)) continue;
    const startMin = toMinutes(r.startTime);
    const endMin = toMinutes(r.endTime);

    let held: HeldReason | undefined;
    if (endMin <= winStart || startMin >= winEnd) held = '가용 시간 밖';
    else if (startMin < winStart || endMin > winEnd) held = '가용 시간 걸침';

    // 겹침 판정은 **보류 여부와 무관하게** 한다. 보류된 루틴을 겹침 계산에서 빼면
    // 창을 걸친 루틴 위에 생성 블록이 그대로 얹혀 더블부킹이 난다.
    if (out.some(it => it.held !== '루틴 겹침' && startMin < it.endMin && it.startMin < endMin)) {
      held = '루틴 겹침';
    }

    out.push({
      routineId: r.id, title: r.title,
      startMin, endMin, start: r.startTime, end: r.endTime, held,
    });
  }
  return out;
}

/**
 * 실제로 그 시각에 무언가를 하고 있는 구간 — 생성 블록이 피해야 할 점유 목록.
 * 창 밖이든 걸치든 점유는 점유다. 동시에 둘을 할 수는 없으니 `루틴 겹침`으로
 * 밀려난 것만 뺀다.
 */
export function busyRanges(placed: readonly PlacedRoutine[]): [number, number][] {
  return placed.filter(it => it.held !== '루틴 겹침').map(it => [it.startMin, it.endMin] as [number, number]);
}

const WEEKDAY_DAYS = [0, 1, 2, 3, 4] as const;
const WEEKEND_DAYS = [5, 6] as const;

/**
 * 폼의 두 가용 창(평일·주말)에 선택한 루틴을 전부 얹어 보고 걸리는 것을 모은다.
 *
 * 같은 루틴이 한 창의 여러 요일에서 같은 사유로 걸리면 한 건으로 접는다 — 학생에게
 * "월·화·수·목·금 다섯 번 걸립니다"는 정보가 아니라 소음이다. 평일·주말 양쪽에 걸리면
 * 창이 다르니 2건으로 남긴다(조치가 창마다 따로 필요하다).
 */
export function diagnoseRoutineFit(form: PlannerForm, routines: readonly Routine[]): RoutineFitIssue[] {
  const selected = routines.filter(r => form.routineIds.includes(r.id));
  if (selected.length === 0) return [];

  const contexts = [
    { key: 'weekdayHours', label: '평일', win: form.weekdayHours, days: WEEKDAY_DAYS },
    { key: 'weekendHours', label: '주말', win: form.weekendHours, days: WEEKEND_DAYS },
  ] as const;

  const issues: RoutineFitIssue[] = [];
  const seen = new Set<string>();

  for (const ctx of contexts) {
    const winStart = ctx.win.start * 60;
    const winEnd = ctx.win.end * 60;
    for (const day of ctx.days) {
      for (const placed of placeRoutinesForDay(selected, day, winStart, winEnd)) {
        if (!placed.held) continue;
        const dedupeKey = `${placed.routineId}|${placed.held}|${ctx.key}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        issues.push({
          routineId: placed.routineId,
          title: placed.title,
          held: placed.held,
          start: placed.start,
          end: placed.end,
          scopeLabel: ctx.label,
          windowKey: ctx.key,
          windowLabel: `${fromMinutes(winStart)}–${fromMinutes(winEnd)}`,
          needStartHour: Math.floor(placed.startMin / 60),
          needEndHour: Math.ceil(placed.endMin / 60),
        });
      }
    }
  }
  return issues;
}

/**
 * '학습 시간 넓히기' 가 만들 새 창 값.
 *
 * 한 루틴이 평일·주말 양쪽에 걸려 있으면 **양쪽을 다 넓혀야** 배너가 사라지므로 창별로
 * 모아서 한 번에 계산한다. `루틴 겹침`은 창을 넓혀도 해결되지 않아 제외한다.
 */
export function widenWindows(
  form: PlannerForm,
  issues: readonly RoutineFitIssue[],
  routineId: string,
): Pick<PlannerForm, 'weekdayHours' | 'weekendHours'> {
  const next = { weekdayHours: { ...form.weekdayHours }, weekendHours: { ...form.weekendHours } };
  for (const issue of issues) {
    if (issue.routineId !== routineId || issue.held === '루틴 겹침') continue;
    const win = next[issue.windowKey];
    win.start = Math.max(0, Math.min(win.start, issue.needStartHour));
    win.end = Math.min(24, Math.max(win.end, issue.needEndHour));
  }
  return next;
}

/**
 * '시간 안쪽으로 옮기기' 가 제안할 새 시각 — 길이는 유지한 채 창 안의 첫 빈자리 앞머리.
 *
 * 주말에만 도는 루틴은 주말 창에서, 그 외는 평일 창에서 자리를 찾는다. 같은 요일에 도는
 * 다른 활성 루틴을 점유로 빼고 남은 세그먼트 중 길이가 맞는 첫 곳을 고른다. 자리가 없으면
 * null — 그때는 창을 넓히거나 루틴을 빼는 수밖에 없다.
 */
export function suggestMoveIn(
  form: PlannerForm,
  routines: readonly Routine[],
  routineId: string,
): { start: string; end: string } | null {
  const target = routines.find(r => r.id === routineId);
  if (!target) return null;

  const length = toMinutes(target.endTime) - toMinutes(target.startTime);
  if (length <= 0) return null;

  const weekendOnly = target.weekdays.every(w => w >= 5);
  const win = weekendOnly ? form.weekendHours : form.weekdayHours;
  const winStart = win.start * 60;
  const winEnd = win.end * 60;

  const busy = routines
    .filter(r => r.id !== routineId && form.routineIds.includes(r.id))
    .filter(r => r.weekdays.some(w => target.weekdays.includes(w)))
    .map(r => [toMinutes(r.startTime), toMinutes(r.endTime)] as [number, number]);

  const slot = subtractRanges([winStart, winEnd], busy).find(([s, e]) => e - s >= length);
  if (!slot) return null;
  return { start: fromMinutes(slot[0]), end: fromMinutes(slot[0] + length) };
}
