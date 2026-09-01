'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Routine } from '@/lib/mock';
import {
  diagnoseRoutineFit, suggestMoveIn, widenWindows,
  type RoutineFitIssue,
} from '@/lib/planner/routine-fit';
import type { PlannerForm } from './builder-types';

type Props = {
  form: PlannerForm;
  setForm: (next: PlannerForm) => void;
  routines: readonly Routine[];
  /**
   * 루틴 원본 시각 수정 — `PATCH /planner/routines/:routineId`. 미주입이면 '옮기기'
   * 조치를 아예 노출하지 않는다(저장되지 않는 조치를 보여 주지 않는다).
   */
  onUpdateRoutine?: (routineId: string, patch: { startTime: string; endTime: string }) => Promise<void>;
};

/** 한 루틴에 대한 이슈 묶음 — 평일·주말 양쪽에 걸리면 2건이 한 카드로 모인다. */
type Grouped = { routineId: string; title: string; issues: RoutineFitIssue[] };

function groupByRoutine(issues: readonly RoutineFitIssue[]): Grouped[] {
  const map = new Map<string, Grouped>();
  for (const issue of issues) {
    const found = map.get(issue.routineId);
    if (found) found.issues.push(issue);
    else map.set(issue.routineId, { routineId: issue.routineId, title: issue.title, issues: [issue] });
  }
  return [...map.values()];
}

/**
 * 한 루틴이 평일·주말에서 **다른 사유로** 걸릴 수 있고(평일은 창 밖, 주말은 다른 루틴과 겹침),
 * 같은 창에서 **창 밖이면서 겹치기까지** 할 수도 있다(07:00–08:00 과 07:30–08:30 을 평일
 * 18–23 창에 함께 얹은 경우). 첫 이슈만 보고 문장을 만들면 나머지 사유가 통째로 숨는다
 * (Codex) — 사유마다 다 적는다.
 */
function describe(group: Grouped): string {
  const parts = group.issues.map(issue => {
    if (issue.held === '루틴 겹침') return `${issue.scopeLabel}은 다른 루틴과 겹쳐요`;
    const verb = issue.held === '가용 시간 걸침' ? '걸쳐 있어요' : '벗어나 있어요';
    return `${issue.scopeLabel} 학습 시간(${issue.windowLabel})을 ${verb}`;
  });
  const [first] = group.issues;
  return `${first.start}–${first.end} 인데 ${parts.join(' · ')}.`;
}

/**
 * 루틴 ↔ 학습 가능 시간 충돌 배너.
 *
 * 루틴은 사용자 단위 라이브러리라 **만들 때는 이 시간표의 창을 알 수 없다**. BE `bakeRoutines`
 * 도 요일만 맞으면 굽기 때문에 서버가 걸러 주지 않는다 — 학생이 알아차릴 수 있는 자리가
 * 위저드 확인 단계뿐이라 여기서 진단하고 조치까지 제공한다.
 */
export function RoutineConflictNotice({ form, setForm, routines, onUpdateRoutine }: Props) {
  const [pendingMove, setPendingMove] = useState<{
    routineId: string; title: string; from: string; to: { start: string; end: string };
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const issues = diagnoseRoutineFit(form, routines);
  if (issues.length === 0) return null;
  const groups = groupByRoutine(issues);

  function widen(group: Grouped) {
    setForm({ ...form, ...widenWindows(form, issues, group.routineId) });
    toast.success('학습 가능 시간을 넓혔어요');
  }

  function drop(routineId: string) {
    setForm({ ...form, routineIds: form.routineIds.filter(id => id !== routineId) });
    toast.success('이 시간표에서 뺐어요 — 루틴 자체는 그대로예요');
  }

  function askMove(group: Grouped) {
    const routine = routines.find(r => r.id === group.routineId);
    const to = suggestMoveIn(form, routines, group.routineId);
    if (!routine || !to) {
      toast.error('학습 시간 안에 빈자리가 없어요 — 시간을 넓히거나 루틴을 빼주세요');
      return;
    }
    setPendingMove({
      routineId: group.routineId, title: group.title,
      from: `${routine.startTime}–${routine.endTime}`, to,
    });
  }

  async function confirmMove() {
    if (!pendingMove || !onUpdateRoutine) return;
    setSaving(true);
    try {
      await onUpdateRoutine(pendingMove.routineId, {
        startTime: pendingMove.to.start,
        endTime: pendingMove.to.end,
      });
      toast.success(`'${pendingMove.title}' 시간을 옮겼어요`);
      setPendingMove(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '루틴 시간을 바꾸지 못했어요');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-live="polite"
      className="border-pullim-danger/40 bg-pullim-danger/5 space-y-3 rounded-xl border p-3"
    >
      <header className="flex items-start gap-2">
        <AlertTriangle className="text-pullim-danger mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0">
          <h3 className="text-pullim-slate-900 text-xs font-bold">
            루틴 {groups.length}개가 학습 시간과 어긋나요
          </h3>
        </div>
      </header>

      <ul className="space-y-2">
        {groups.map(group => {
          // 사유가 섞일 수 있으므로 조치를 **사유별로** 판단한다. 창을 넓혀도 루틴끼리의
          // 겹침은 절대 풀리지 않으므로, 넓히기만으로 끝나지 않는다는 것도 알려준다(Codex).
          const windowIssues = group.issues.filter(i => i.held !== '루틴 겹침');
          const hasOverlap = group.issues.some(i => i.held === '루틴 겹침');
          // 라벨은 '루틴이 원하는 시각'이 아니라 **누르면 실제로 만들어질 창**을 보여준다 —
          // 창은 기존 값과 병합(min/max)되므로 둘이 다르다.
          const widened = widenWindows(form, issues, group.routineId);
          const widenLabel = (() => {
            if (windowIssues.length !== 1) return '평일·주말 학습 시간 넓히기';
            const target = widened[windowIssues[0].windowKey];
            return `학습 시간 ${String(target.start).padStart(2, '0')}:00–${String(target.end).padStart(2, '0')}:00 로 넓히기`;
          })();
          // 옮기기는 창 밖·겹침을 한 번에 푼다(도는 요일의 창 교집합에서 다른 루틴을 피해 고른다).
          const movable = onUpdateRoutine && suggestMoveIn(form, routines, group.routineId) !== null;
          return (
            <li key={group.routineId} className="bg-card border-pullim-slate-200 rounded-lg border p-2.5">
              <p className="text-pullim-slate-900 text-xs font-bold">{group.title}</p>
              <p className="text-pullim-slate-600 mt-0.5 text-[length:var(--text-xs)] leading-relaxed">{describe(group)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {movable && (
                  <ActionButton primary onClick={() => askMove(group)}>시간 안쪽으로 옮기기</ActionButton>
                )}
                {windowIssues.length > 0 && (
                  <ActionButton primary={!movable} onClick={() => widen(group)}>{widenLabel}</ActionButton>
                )}
                <ActionButton onClick={() => drop(group.routineId)}>이 시간표에서 빼기</ActionButton>
              </div>
              {windowIssues.length > 0 && hasOverlap && (
                <p className="text-pullim-slate-500 mt-1.5 text-[length:var(--text-xs)]">
                  학습 시간을 넓혀도 루틴끼리의 겹침은 남아요.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={pendingMove !== null} onOpenChange={(open) => { if (!open) setPendingMove(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">루틴 시간을 바꿀까요?</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              {pendingMove && (
                <>
                  <strong className="text-pullim-slate-900">{pendingMove.title}</strong> 을(를){' '}
                  <span className="font-mono">{pendingMove.from}</span> →{' '}
                  <span className="text-pullim-blue-600 font-mono font-bold">
                    {pendingMove.to.start}–{pendingMove.to.end}
                  </span>{' '}
                  로 옮겨요.
                  <br />
                  <br />
                  이 루틴은 <strong className="text-pullim-slate-900">다른 시간표에도 함께 쓰이는 내 루틴</strong>이에요.
                  시간을 바꾸면 그쪽 계획의 이 루틴도 같이 바뀝니다.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <ActionButton onClick={() => setPendingMove(null)}>취소</ActionButton>
            <ActionButton primary disabled={saving} onClick={confirmMove}>
              {saving ? '바꾸는 중…' : '루틴 시간 바꾸기'}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ActionButton({
  children, onClick, primary, disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[length:var(--text-xs)] font-bold transition-colors',
        'focus-visible:ring-pullim-blue-500 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        primary
          ? 'bg-pullim-blue-600 border-pullim-blue-600 hover:bg-pullim-blue-700 text-white'
          : 'bg-card text-pullim-slate-700 border-pullim-slate-200 hover:border-pullim-blue-300',
      )}
    >
      {children}
    </button>
  );
}
