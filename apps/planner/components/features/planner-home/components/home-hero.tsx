import { HeroMotion3D } from './hero-motion-3d';

type Props = {
  examName: string;
  dday: number;
  daySummary: { done: number; total: number };
  weekMeta: { totalHours: number; completedHours: number };
};

/**
 * 홈 히어로 — D-Day 밴드의 승격. 형제 앱 공통 그라디언트 히어로의 컴팩트 버전
 * (매일 쓰는 달력 대시보드라 세로 공간을 아낀다). 3D 장식은 absolute라 높이에 영향 없음.
 */
export function HomeHero({ examName, dday, daySummary, weekMeta }: Props) {
  const ddayLabel = dday === 0 ? 'D-DAY' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`;
  const showDay = daySummary.total > 0;
  const showWeek = weekMeta.totalHours > 0;

  return (
    <section
      aria-label="학습 현황 요약"
      className="from-pullim-blue-700 to-pullim-blue-900 relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br px-5 py-5 text-white sm:px-6"
    >
      <HeroMotion3D />
      <div className="relative z-10">
        <div className="flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.16em] text-white/70 uppercase">
          <span aria-hidden className="bg-pullim-lemon h-1.5 w-1.5 rounded-full" />
          Pullim Planner
        </div>
        <h2 className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">
          <span className="mr-2 inline-block max-w-[14ch] truncate align-bottom">{examName}</span>
          <span className="text-pullim-lemon align-bottom">{ddayLabel}</span>
        </h2>
        {(showDay || showWeek) && (
          <p className="mt-1 text-[13px] text-white/80">
            {showDay && (
              <>
                오늘 <strong className="font-bold text-white">{daySummary.done}/{daySummary.total}</strong> 블록 완료
              </>
            )}
            {showDay && showWeek && <span className="mx-1.5 opacity-50">·</span>}
            {showWeek && (
              <>
                이번 주 계획 <strong className="font-bold text-white">{weekMeta.totalHours}h</strong>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
