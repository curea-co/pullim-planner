import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * D-day Chip — **순수 뷰**.
 *
 * tier/label/title/showCalIcon 등 도메인 계산은 caller가 수행 후 props로 주입.
 * helper: `composeDDayChipProps(dday, examName)` in `@/lib/planner/d-day-tier`
 */
interface DDayChipProps {
  chipClass: string;
  label: string;
  title?: string;
  showCalIcon: boolean;
  className?: string;
}

export function DDayChip({ chipClass, label, title, showCalIcon, className }: DDayChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs',
        chipClass,
        className,
      )}
      title={title}
    >
      {showCalIcon && <Calendar className="h-3 w-3" aria-hidden />}
      {label}
    </span>
  );
}
