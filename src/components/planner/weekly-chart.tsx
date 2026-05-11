'use client';

import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { weeklyStudyHours } from '@/lib/mock';
import { pullimBlue, pullimSlate } from '@/lib/tokens';

/**
 * 주간 학습 시간 그래프 — 목표선 + 실제.
 * 핸드오프 4.3 (홈·주간 그래프).
 */
export function WeeklyChart() {
  const goal = weeklyStudyHours[0]?.goal ?? 4;
  const total = weeklyStudyHours.reduce((s, d) => s + d.hours, 0);
  const goalTotal = weeklyStudyHours.reduce((s, d) => s + d.goal, 0);
  const pct = Math.round((total / goalTotal) * 100);

  return (
    <section className="bg-card rounded-xl border p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-pullim-slate-900 text-sm font-bold">이번 주 학습 시간</h3>
        <div className="text-right">
          <span className="text-pullim-slate-900 font-mono text-base font-bold">
            {total.toFixed(1)}h
          </span>
          <span className="text-pullim-slate-600 ml-1 text-xs">/ {goalTotal}h ({pct}%)</span>
        </div>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyStudyHours} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: pullimSlate[600], fontWeight: 600 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: pullimSlate[500] }}
              width={26}
            />
            <Tooltip
              cursor={{ fill: 'rgba(59,111,246,0.06)' }}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: `1px solid ${pullimSlate[200]}`,
                padding: '6px 10px',
              }}
              formatter={(v) => [`${v}h`, '학습 시간']}
            />
            <ReferenceLine y={goal} stroke={pullimSlate[300]} strokeDasharray="2 3" />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]} barSize={18}>
              {weeklyStudyHours.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.hours >= d.goal ? pullimBlue[500] : pullimBlue[200]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
