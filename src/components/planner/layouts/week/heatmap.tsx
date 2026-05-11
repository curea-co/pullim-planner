'use client';

/**
 * 주간 레이아웃 — 시간×요일 히트맵.
 * 행=시간대(2시간 슬롯, 06~24시 9슬롯), 열=요일. 셀=학습 강도.
 *
 * 데이터: `weekView`의 일별 totalMinutes를 균등 분할해 합성된 강도 표현 (mock).
 * 색상: 활성 팔레트의 `concept` 색을 강도별 opacity로 적용.
 */

import { weekView, getBlockColor, type PaletteId } from '@/lib/mock';
import { cn } from '@/lib/utils';

type Props = {
  paletteId?: PaletteId;
  compact?: boolean;
};

const HOUR_SLOTS = [
  { label: '06–08', start: 6 },
  { label: '08–10', start: 8 },
  { label: '10–12', start: 10 },
  { label: '12–14', start: 12 },
  { label: '14–16', start: 14 },
  { label: '16–18', start: 16 },
  { label: '18–20', start: 18 },
  { label: '20–22', start: 20 },
  { label: '22–24', start: 22 },
];

/**
 * 일자별 학습 분포를 슬롯 강도(0~1)로 합성.
 * weekView에 시간대 정보가 없으니 *일일 총량*을 9슬롯에 비례 + 가중치(저녁 슬롯 우대)로 분배.
 */
function dayToSlotIntensities(totalMinutes: number, isWeekend: boolean): number[] {
  // 슬롯 가중치 — 평일은 저녁(18~22) 강화, 주말은 오후(14~20) 균등
  const weights = isWeekend
    ? [0.5, 0.7, 0.9, 0.9, 1.0, 1.0, 0.9, 0.7, 0.4]
    : [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 1.0, 1.0, 0.7];

  const weightSum = weights.reduce((s, w) => s + w, 0);
  // 슬롯별 분배 (minutes)
  const slotMinutes = weights.map(w => (totalMinutes * w) / weightSum);
  // 강도 = slotMinutes / 120(슬롯 최대 분) 클램프
  return slotMinutes.map(m => Math.min(1, m / 120));
}

export function HeatmapLayout({ paletteId, compact }: Props) {
  const baseColor = getBlockColor('concept', paletteId);
  const days = weekView.map(d => ({
    day: d.day,
    date: d.date,
    isToday: d.isToday,
    intensities: dayToSlotIntensities(d.totalMinutes, d.day === '토' || d.day === '일'),
  }));

  const cellH = compact ? 16 : 22;

  return (
    <section className="bg-card overflow-hidden rounded-2xl border p-3">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th
                scope="col"
                className="bg-pullim-slate-50 text-pullim-slate-700 w-14 px-1 py-1 text-left font-mono text-[9px] font-semibold"
              >
                시간
              </th>
              {days.map(d => (
                <th
                  key={d.day}
                  scope="col"
                  className={cn(
                    'min-w-[34px] py-1 text-center text-[10px] font-semibold',
                    d.isToday ? 'bg-pullim-blue-50 text-pullim-blue-700' : 'bg-pullim-slate-50 text-pullim-slate-700',
                  )}
                >
                  {d.day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOUR_SLOTS.map((slot, slotIdx) => (
              <tr key={slot.label} className="border-pullim-slate-100 border-t">
                <th
                  scope="row"
                  className="bg-pullim-slate-25 text-pullim-slate-500 px-1 py-0.5 text-left font-mono text-[9px]"
                >
                  {slot.label}
                </th>
                {days.map(d => {
                  const intensity = d.intensities[slotIdx];
                  return (
                    <td
                      key={d.day}
                      className="border-pullim-slate-100 border-l p-0.5"
                      title={`${d.day} ${slot.label} · 강도 ${(intensity * 100).toFixed(0)}%`}
                    >
                      <div
                        className="rounded"
                        style={{
                          height: cellH,
                          background: intensity > 0.05 ? baseColor : 'var(--color-pullim-slate-50)',
                          opacity: intensity > 0.05 ? 0.2 + intensity * 0.8 : 0.4,
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!compact && (
        <p className="text-pullim-slate-400 mt-2 text-[10px]">
          진한 셀 = 학습 강도 높음. 데모용 가중치 (평일은 저녁, 주말은 오후 강화).
        </p>
      )}
    </section>
  );
}
