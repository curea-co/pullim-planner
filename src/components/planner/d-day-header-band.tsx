import { shouldShowDDayHeaderBand } from '@/lib/planner/d-day-tier';

type Props = {
  dday: number;
  examName?: string;
};

/**
 * D-3 이내(또는 당일) 헤더 띠 — 11-planner-design.md § 2.1
 * 페이지 상단에 4px 두께 warn-cta-bg 띠. 호버 시 툴팁으로 카피 노출.
 * 위협이 아닌 권유형 카피 — `07 § 4.5.1` 4원칙 준수.
 */
export function DDayHeaderBand({ dday, examName }: Props) {
  if (!shouldShowDDayHeaderBand(dday)) return null;

  const tipBase = examName ?? '시험';
  const tooltip =
    dday === 0
      ? `오늘 ${tipBase} — 컨디션 안정 우선, 새 단원 No`
      : `${tipBase}까지 ${dday}일 — 컨디션 75% 이상 유지하기`;

  return (
    <div
      role="status"
      aria-label={tooltip}
      title={tooltip}
      className="bg-pullim-warn-cta-bg h-1 w-full rounded-b cursor-help"
    />
  );
}
