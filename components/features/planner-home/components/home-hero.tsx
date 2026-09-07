import { shouldShowDDayHeaderBand } from '@/lib/planner/d-day-tier';
import { HeroMotion3D } from './hero-motion-3d';

type Props = {
  examName: string;
  dday: number;
  /** 활성 계획표 유무 — 없으면 D-DAY 대신 "아직 시간표가 없어요" 빈 상태 카피 (QA #7) */
  hasActivePlanner?: boolean;
  /**
   * 목록 조회 실패 — "아직 시간표가 없어요"를 **쓰면 안 되는** 상태다. 시간표가 있는 사용자에게
   * 없다고 말하는 것이라, 빈 상태 카피가 그 자리에서 거짓말이 된다.
   *
   * `hasActivePlanner` **보다 먼저** 본다. 실패 전에 읽어 둔 활성 시간표가 남아 있으면
   * `hasActivePlanner` 는 계속 true 라, 뒤에 두면 히어로만 옛 D-day 를 정상값처럼 계속 보여준다
   * — 본문은 실패 카드인데 위는 멀쩡한, 서로 어긋난 화면이 된다.
   */
  loadError?: boolean;
  /**
   * 오늘·이번 주 요약을 만들 데이터가 **없다**(히어로 기간 조회 실패 + 현재 뷰가 이번 주를
   * 다 덮지 못함). 수치를 0 으로 접어 숨기면 그것이야말로 "계획 없음"으로 위장하는 것이라,
   * 숨기는 대신 못 불러왔다고 말한다.
   */
  summaryError?: boolean;
  daySummary: { done: number; total: number };
  weekMeta: { totalHours: number; completedHours: number };
};

/**
 * 홈 히어로 — D-Day 밴드의 승격(대체). 형제 앱 공통 그라디언트 히어로의 컴팩트 버전
 * (매일 쓰는 달력 대시보드라 세로 공간을 아낀다). 3D 장식은 absolute라 높이에 영향 없음.
 * 직전 구간(today/critical, ~D-6) 임박 카피(11-planner-design § 2.1 — 위협 아닌 권유형,
 * `07 § 4.5.1` 4원칙)는 별도 밴드 대신 히어로 안 status 라인으로 흡수한다.
 */
export function HomeHero({ examName, dday, hasActivePlanner = true, loadError = false, summaryError = false, daySummary, weekMeta }: Props) {
  const ddayLabel = dday === 0 ? 'D-DAY' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`;
  const showDay = hasActivePlanner && !loadError && daySummary.total > 0;
  const showWeek = hasActivePlanner && !loadError && weekMeta.totalHours > 0;
  // 조회가 실패했으면 D-day 자체가 못 믿을 값이다 — 임박 권유를 띄우지 않는다.
  const urgent = hasActivePlanner && !loadError && shouldShowDDayHeaderBand(dday);
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
        <div className="flex items-center gap-1.5 font-mono text-[length:var(--text-2xs)] font-medium tracking-[0.16em] text-white/70 uppercase">
          <span aria-hidden className="bg-pullim-lemon h-1.5 w-1.5 rounded-full" />
          Pullim Planner
        </div>
        {loadError ? (
          <>
            {/* 조회 실패 — "없다"가 아니라 "모른다". 재시도는 달력 자리의 실패 카드가 제공한다.
                실패 전에 읽어 둔 시간표가 남아 있어도 이 분기가 먼저다 — 옛 D-day 를 현재값처럼
                보여주면 본문의 실패 카드와 어긋난다. */}
            <h2 className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">
              학습 현황을 불러오지 못했어요
            </h2>
            <p className="mt-1 text-[length:var(--text-sm)] text-white/80">
              시간표가 없는 게 아니라 조회가 실패했어요. 아래에서 다시 시도할 수 있어요.
            </p>
          </>
        ) : hasActivePlanner ? (
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
            <p className="mt-1 text-[length:var(--text-sm)] text-white/80">
              시간표를 만들고 활성화하면 D-DAY와 학습 현황이 여기에 표시돼요.
            </p>
          </>
        )}
        {summaryError && !loadError && (
          // 수치를 0 으로 접어 숨기면 "계획 없음"과 구분되지 않는다 — 이 PR 이 닫으려는 바로 그
          // 위장이다. 본문(달력)은 멀쩡할 수 있으므로 실패 카드로 올리지 않고 여기서만 말한다.
          <p role="status" className="mt-1 text-[length:var(--text-sm)] text-white/80">
            오늘·이번 주 요약을 불러오지 못했어요.
          </p>
        )}
        {(showDay || showWeek) && (
          <p className="mt-1 text-[length:var(--text-sm)] text-white/80">
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
            className="text-pullim-lemon mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[length:var(--text-xs)] font-medium"
          >
            <span aria-hidden className="bg-pullim-lemon h-1 w-1 rounded-full" />
            {urgentCopy}
          </p>
        )}
      </div>
    </section>
  );
}
