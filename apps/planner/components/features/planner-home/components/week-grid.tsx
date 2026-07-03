'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { weekView, blockTypeMeta, getBlockColor, type BlockType, type PaletteId, type WeekDay } from '@/lib/mock';
import { getActiveCustomization } from '@/lib/hooks/use-planner-customization';
import { cn } from '@/lib/utils';

const visibleTypes: BlockType[] = ['concept', 'practice', 'review', 'memorize', 'mock', 'tutor', 'self_explain'];

type WeekGridProps = {
  /** 색상 팔레트 override (미리보기용). 미지정 시 활성 플래너 팔레트. */
  paletteId?: PaletteId;
  /** 컴팩트 모드 — 미리보기 영역에서 헤더/범례 축소 */
  compact?: boolean;
  /** 실데이터(B4) 주간 집계 — 미주입이면 mock 데모(weekView) 폴백. */
  days?: WeekDay[];
};

/**
 * 주간 그리드 — 7열 × 블록 타입 행. 각 셀: 블록 수 + 색상 강도(분 단위).
 * 핸드오프 4.4 (주간 뷰 단순화 버전).
 */
export function WeekGrid({ paletteId, compact, days: daysProp }: WeekGridProps = {}) {
  const router = useRouter();
  const isReal = daysProp !== undefined;
  const week = daysProp ?? weekView;
  const activePalette = paletteId ?? getActiveCustomization().paletteId;
  // 셀 색상 강도 산출용(블록 없으면 1로 나눗셈 방어)
  const maxMinutes = Math.max(1, ...week.flatMap(d => d.blocks.map(b => b.minutes)));

  function openDay(day: WeekDay) {
    if (day.isToday) {
      router.push('/planner/calendar?view=day');
      return;
    }
    if (isReal) {
      // 실데이터 — 다른 요일도 데이터는 있으나 일간 뷰 날짜 딥링크(offset URL) 미지원.
      // 거짓 안내("오늘만 데이터") 대신 요약 toast 만(딥링크는 후속 — B4b).
      toast.info(`📅 ${day.day}요일 (${day.date}일)`, {
        description: `계획 ${Math.round(day.totalMinutes / 60 * 10) / 10}h · 완료 ${day.completionPct}% — 일간 이동은 상단 날짜 이동으로 볼 수 있어요.`,
      });
      return;
    }
    toast.info(`📅 ${day.day}요일 (${day.date}일)`, {
      description: `${Math.round(day.totalMinutes / 60 * 10) / 10}h 학습 · 완료 ${day.completionPct}% — 일간 뷰는 오늘만 데이터가 채워져 있어요.`,
    });
  }

  return (
    <section className="bg-card overflow-hidden rounded-2xl border">
      {!compact && (
        <header className="border-b p-4">
          <p className="text-pullim-blue-600 text-[10px] font-bold tracking-wider uppercase">
            주간 학습표
          </p>
          <h2 className="text-pullim-slate-900 mt-0.5 text-base font-bold tracking-tight">
            이번 주 학습 분포
          </h2>
          <p className="text-pullim-slate-500 mt-0.5 text-[11px]">
            행 = 블록 타입 · 열 = 요일 · 막대 길이 = 학습 시간
          </p>

          {/* 색상 범례 — week 컨텍스트에서 시간 분포 해석에 필요 */}
          <ul className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {visibleTypes.map(t => {
              const m = blockTypeMeta[t];
              return (
                <li key={t} className="text-pullim-slate-600 inline-flex items-center gap-1 text-[10px]">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: getBlockColor(t, activePalette) }}
                    aria-hidden
                  />
                  {m.label}
                </li>
              );
            })}
          </ul>
        </header>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-pullim-slate-700 text-[10px]">
              <th className="bg-pullim-slate-50 px-2 py-2 text-left font-semibold">타입</th>
              {week.map(d => (
                <th
                  key={d.day}
                  className={cn(
                    'min-w-[40px] p-0 text-center font-semibold',
                    d.isToday ? 'bg-pullim-blue-50 text-pullim-blue-700' : 'bg-pullim-slate-50',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => openDay(d)}
                    aria-label={`${d.day}요일 (${d.date}일) 일간 뷰`}
                    className={cn(
                      'w-full px-0.5 py-2 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pullim-blue-500',
                      d.isToday ? 'hover:bg-pullim-blue-100' : 'hover:bg-pullim-slate-100',
                    )}
                  >
                    <div className="font-mono text-[11px]">{d.day}</div>
                    <div className={cn('text-[9px] font-mono mt-0.5', d.isToday ? 'text-pullim-blue-700' : 'text-pullim-slate-600')}>
                      {d.date}
                    </div>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleTypes.map(type => {
              const meta = blockTypeMeta[type];
              const MetaIcon = meta.Icon;
              return (
                <tr key={type} className="border-pullim-slate-100 border-t">
                  <th
                    scope="row"
                    className="text-pullim-slate-700 flex items-center gap-1 px-2 py-1.5 text-left text-[11px] font-semibold"
                  >
                    <MetaIcon aria-hidden className="h-3.5 w-3.5 shrink-0 text-pullim-slate-500" />
                    <span className="truncate">{meta.label}</span>
                  </th>
                  {week.map(d => {
                    const block = d.blocks.find(b => b.type === type);
                    const intensity = block ? block.minutes / maxMinutes : 0;
                    return (
                      <td key={d.day} className="border-pullim-slate-100 border-l p-1">
                        <Cell minutes={block?.minutes ?? 0} count={block?.count ?? 0} intensity={intensity} color={getBlockColor(type, activePalette)} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* 합계 행 */}
            <tr className="border-pullim-slate-200 bg-pullim-slate-50 border-t-2">
              <th scope="row" className="text-pullim-slate-700 px-2 py-1.5 text-left text-[11px] font-bold">
                합계
              </th>
              {week.map(d => (
                <td
                  key={d.day}
                  className="border-pullim-slate-100 border-l py-1.5 text-center"
                  title={`${Math.round(d.totalMinutes / 60 * 10) / 10}h · 완료 ${d.completionPct}%`}
                >
                  <div className={cn('font-mono text-[11px] font-bold', d.isToday ? 'text-pullim-blue-700' : 'text-pullim-slate-900')}>
                    {Math.round(d.totalMinutes / 60 * 10) / 10}h
                  </div>
                  <div className={cn(
                    'mt-0.5 font-mono text-[9px] font-semibold',
                    d.completionPct === 100 ? 'text-pullim-success' : d.completionPct > 0 ? 'text-pullim-blue-700' : 'text-pullim-slate-500',
                  )}>
                    {d.completionPct}%
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * 셀 — 색상 막대만 노출. 분/카운트는 hover 시 native title로.
 * 시각: 막대 *높이* = 학습 시간 비율 (max 기준 정규화). bottom-up으로 자라남.
 */
function Cell({ minutes, count, intensity, color }: { minutes: number; count: number; intensity: number; color: string }) {
  if (minutes === 0) {
    return <div className="bg-pullim-slate-50 h-12 w-full rounded" aria-hidden />;
  }
  const barPct = Math.max(20, Math.round(intensity * 100));
  return (
    <div
      className="bg-pullim-slate-50 relative h-12 w-full overflow-hidden rounded"
      title={`${count}개 블록 · ${minutes}분`}
    >
      <div
        className="absolute right-0 bottom-0 left-0 rounded-t"
        style={{ height: `${barPct}%`, background: color, opacity: 0.85 }}
        aria-hidden
      />
    </div>
  );
}
