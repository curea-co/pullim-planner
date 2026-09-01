'use client';

import { Heart, Flag } from 'lucide-react';
import { buildParentReport } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 부모님께 전송될 카드 미리보기 — 학생 view와 분리된 큐레이션.
 *
 * 학생 reports는 메트릭 풍부·차트 다수지만, 부모는 *즉시 알고 싶은 3가지 + AI 코멘트 + 마일스톤*만.
 * ConsentDialog 안의 미리보기 섹션에 노출.
 */
export function ParentReportCard() {
  const r = buildParentReport();

  return (
    <article
      aria-label="부모 전송 미리보기"
      className="bg-pullim-blue-50/40 rounded-xl border border-pullim-blue-200 p-3.5"
    >
      <header className="flex items-center justify-between gap-2">
        <span className="text-pullim-blue-700 inline-flex items-center gap-1 text-[length:var(--text-xs)] font-bold tracking-wider uppercase">
          <Heart className="h-3 w-3" /> 부모님이 받는 카드
        </span>
        <span className="text-pullim-slate-500 text-[length:var(--text-xs)]">미리보기</span>
      </header>

      <h4 className="text-pullim-slate-900 mt-2 text-sm font-bold leading-snug">
        {r.headline}
      </h4>

      <ul className="mt-2.5 grid grid-cols-3 gap-1.5">
        {r.metrics.map(m => (
          <li
            key={m.label}
            className={cn(
              'rounded-lg border p-2 text-center',
              m.tone === 'good'
                ? 'border-pullim-success/30 bg-pullim-success-bg'
                : m.tone === 'warn'
                ? 'border-pullim-warn/30 bg-pullim-warn-bg'
                : 'border-pullim-slate-200 bg-card',
            )}
          >
            <div className="text-pullim-slate-500 text-[length:var(--text-xs)] font-bold tracking-wider uppercase">
              {m.label}
            </div>
            <div
              className={cn(
                'mt-0.5 font-mono text-[length:var(--text-xs)] font-bold',
                m.tone === 'good' ? 'text-pullim-success-ink'
                : m.tone === 'warn' ? 'text-pullim-warn-ink'
                : 'text-pullim-slate-900',
              )}
            >
              {m.value}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-pullim-slate-700 mt-2.5 text-[length:var(--text-xs)] leading-relaxed">
        {r.comment}
      </p>

      {r.upcomingMilestone && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-card border border-pullim-slate-200 px-2 py-1 text-[length:var(--text-xs)] font-semibold text-pullim-slate-700">
          <Flag className="text-pullim-warn h-3 w-3" />
          {r.upcomingMilestone}
        </div>
      )}

      <p className="text-pullim-slate-500 mt-2 text-[length:var(--text-xs)] italic">
        {r.encouragement}
      </p>
    </article>
  );
}
