import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Badge — pill-shaped tag for status, category, count.
 *
 * 라운드는 `rounded-[var(--radius-full)]` 로 준다. Tailwind 의 `rounded-full` 은
 * 9999px 로 컴파일돼 CSS 변수를 무시하는데, 그러면 variant-a(--radius-full: 0)
 * 에서 배지가 각지지 않는다. 알약형 컨테이너는 변형을 따라야 한다.
 */

const badgeVariants = cva(
  "inline-flex items-center gap-[var(--gap-xs)] px-[var(--pad-sm)] rounded-[var(--radius-full)] text-[length:var(--text-xs)] font-medium leading-tight h-[22px]",
  {
    variants: {
      intent: {
        neutral: "bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
        primary: "bg-[var(--container-primary)] text-[var(--on-container-primary)]",
        success: "bg-[var(--container-success)] text-[var(--on-container-success)]",
        warning: "bg-[var(--container-warning)] text-[var(--on-container-warning)]",
        danger: "bg-[var(--container-danger)] text-[var(--on-container-danger)]",
        info: "bg-[var(--container-info)] text-[var(--on-container-info)]",
      },
    },
    defaultVariants: { intent: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, intent, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ intent }), className)}
      {...props}
    />
  )
);
Badge.displayName = "Badge";
