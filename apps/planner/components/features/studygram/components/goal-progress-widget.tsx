'use client';

import { Flame } from 'lucide-react';

interface GoalProgressWidgetProps {
  posted: number;
  goalTotal: number;
  remainDays: number;
  streakDays: number;
  topicLine: string;
}

export function GoalProgressWidget({
  posted,
  goalTotal,
  remainDays,
  streakDays,
  topicLine,
}: GoalProgressWidgetProps) {
  const pct = Math.min(100, Math.round((posted / goalTotal) * 100));

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-pullim-sm">
      {/* 주제 */}
      <p className="text-xs font-semibold text-muted-foreground line-clamp-1">{topicLine}</p>

      {/* 숫자 요약 */}
      <div className="mt-2 flex items-end gap-1">
        <span className="text-2xl font-bold text-foreground tabular-nums">{posted}</span>
        <span className="mb-0.5 text-sm text-muted-foreground">/ {goalTotal} 인증</span>
        <span className="mb-0.5 ml-auto text-sm text-muted-foreground">D-{remainDays}</span>
      </div>

      {/* 프로그레스 바 */}
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-pullim-slate-100">
        <div
          className="h-full rounded-full bg-pullim-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* streak */}
      {streakDays > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-pullim-blue-600">
          <Flame className="h-3.5 w-3.5" />
          {streakDays}일 연속 인증 중!
        </div>
      )}
    </div>
  );
}
