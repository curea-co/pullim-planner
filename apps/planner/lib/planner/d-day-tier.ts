/**
 * D-day Tier 시스템 — 11-planner-design.md § 2
 *
 * 시험까지 남은 일수에 따라 시각·행동 강도를 5단계로 분류한다.
 * 카운트는 양수(시험 전), 0(당일), 음수(지난 후)를 받는다.
 */

export type DDayTier = 'normal' | 'attention' | 'imminent' | 'critical' | 'today' | 'past';

/** D-day 일수 → Tier */
export function getDDayTier(dday: number): DDayTier {
  if (dday < 0) return 'past';
  if (dday === 0) return 'today';
  if (dday <= 6) return 'critical';   // D-1 ~ D-6 — 직전
  if (dday <= 14) return 'imminent';  // D-7 ~ D-14 — 임박
  if (dday <= 30) return 'attention'; // D-15 ~ D-30 — 주의
  return 'normal';                    // D-31+ — 평시
}

/** Tier별 알약(chip) Tailwind 클래스 */
export function tierChipClass(tier: DDayTier): string {
  switch (tier) {
    case 'today':
      return 'bg-pullim-danger text-white font-bold';
    case 'critical':
      // 미세 pulse 모션 — 직전 (D-1 ~ D-6)
      return 'bg-pullim-danger-bg text-pullim-danger font-bold animate-pulse';
    case 'imminent':
      return 'bg-pullim-warn-bg text-pullim-warn-cta-bg font-bold';
    case 'attention':
      return 'bg-pullim-blue-100 text-pullim-blue-700 font-bold';
    case 'past':
      return 'bg-pullim-slate-100 text-pullim-slate-500';
    case 'normal':
    default:
      return 'bg-pullim-slate-100 text-pullim-slate-700';
  }
}

/** D-3 이내 헤더 띠 노출 여부 */
export function shouldShowDDayHeaderBand(dday: number): boolean {
  const tier = getDDayTier(dday);
  return tier === 'today' || tier === 'critical';
}

/** DDayChip(순수 뷰)에 줄 props 조합 — tier/label/title/showCalIcon 도메인 계산 */
export interface DDayChipViewProps {
  chipClass: string;
  label: string;
  title?: string;
  showCalIcon: boolean;
}

export function composeDDayChipProps(dday: number, examName?: string): DDayChipViewProps {
  const tier = getDDayTier(dday);
  const chipClass = tierChipClass(tier);
  const showCalIcon = tier === 'imminent' || tier === 'critical' || tier === 'today';

  const label =
    tier === 'today' ? '오늘 D-DAY'
    : dday > 0 ? `D-${dday}`
    : `D+${Math.abs(dday)}`;

  const title = examName
    ? `${examName} · ${tier === 'today' ? '오늘' : dday > 0 ? `${dday}일 남음` : `${Math.abs(dday)}일 지남`}`
    : undefined;

  return { chipClass, label, title, showCalIcon };
}
