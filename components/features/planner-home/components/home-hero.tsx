import { shouldShowDDayHeaderBand } from '@/lib/planner/d-day-tier';
import { HeroMotion3D } from './hero-motion-3d';

type Props = {
  examName: string;
  dday: number;
  /** 활성 계획표 유무 — 없으면 D-DAY 대신 "아직 시간표가 없어요" 빈 상태 카피 (QA #7) */
  hasActivePlanner?: boolean;
  daySummary: { done: number; total: number };
  weekMeta: { totalHours: number; completedHours: number };
};

/**
 * 홈 히어로 — D-Day 밴드의 승격(대체). 형제 앱 공통 그라디언트 히어로의 컴팩트 버전
 * (매일 쓰는 달력 대시보드라 세로 공간을 아낀다). 3D 장식은 absolute라 높이에 영향 없음.
 * 직전 구간(today/critical, ~D-6) 임박 카피(11-planner-design § 2.1 — 위협 아닌 권유형,
 * `07 § 4.5.1` 4원칙)는 별도 밴드 대신 히어로 안 status 라인으로 흡수한다.
 */
export function HomeHero({ examName, dday, hasActivePlanner = true, daySummary, weekMeta }: Props) {
  const ddayLabel = dday === 0 ? 'D-DAY' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`;
  const showDay = hasActivePlanner && daySummary.total > 0;
  const showWeek = hasActivePlanner && weekMeta.totalHours > 0;
  const urgent = hasActivePlanner && shouldShowDDayHeaderBand(dday);
  const urgentCopy =
    dday === 0
      ? `오늘 ${examName} — 컨디션 안정 우선, 새 단원 No`
      : `${examName}까지 ${dday}일 — 컨디션 75% 이상 유지하기`;

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
        {hasActivePlanner ? (
          <h2 className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">
            <span className="mr-2 inline-block max-w-[14ch] truncate align-bottom">{examName}</span>
            <span className="text-pullim-lemon align-bottom">{ddayLabel}</span>
          </h2>
        ) : (
          <>
            {/* QA #7 — 활성 계획표 없음: D-DAY 대신 빈 상태 카피 */}
            <h2 className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">
              아직 시간표가 없어요
            </h2>
            <p className="mt-1 text-[13px] text-white/80">
              시간표를 만들고 활성화하면 D-DAY와 학습 현황이 여기에 표시돼요.
            </p>
          </>
        )}
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
        {urgent && (
          <p
            role="status"
            className="text-pullim-lemon mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium"
          >
            <span aria-hidden className="bg-pullim-lemon h-1 w-1 rounded-full" />
            {urgentCopy}
          </p>
        )}
      </div>
    </section>
  );
}
