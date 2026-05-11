'use client';

import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { pullimBlue, pullimSlate } from '@/lib/tokens';

/** 7일 정답률 추세 (mock — 본 데모는 결정론적). */
const trendData = [
  { day: '월', accuracy: 72 },
  { day: '화', accuracy: 78 },
  { day: '수', accuracy: 81 },
  { day: '목', accuracy: 88 },  // 오늘
  { day: '금', accuracy: null }, // 미래
  { day: '토', accuracy: null },
  { day: '일', accuracy: null },
];

const goalLine = 80;

/** 7일 정답률 라인 차트 — 주간 회고 본문에서 사용. */
export function AccuracyTrendChart() {
  return (
    <section className="bg-card rounded-xl border p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-pullim-slate-900 text-sm font-bold">정답률 추세</h3>
        <span className="text-pullim-slate-400 text-[10px]">목표 {goalLine}% · 점선</span>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={trendData} margin={{ top: 8, right: 8, bottom: 0, left: -28 }}>
            <CartesianGrid stroke={pullimSlate[100]} vertical={false} strokeDasharray="2 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: pullimSlate[600], fontWeight: 600 }}
            />
            <YAxis
              domain={[50, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: pullimSlate[500] }}
              width={28}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              cursor={{ stroke: pullimBlue[200], strokeDasharray: '2 3' }}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: `1px solid ${pullimSlate[200]}`,
                padding: '6px 10px',
              }}
              formatter={(v) => v == null ? ['—', '정답률'] : [`${v}%`, '정답률']}
            />
            <ReferenceLine y={goalLine} stroke={pullimSlate[300]} strokeDasharray="2 3" />
            <Line
              type="monotone"
              dataKey="accuracy"
              stroke={pullimBlue[600]}
              strokeWidth={2.5}
              dot={{ fill: pullimBlue[600], r: 3.5, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
