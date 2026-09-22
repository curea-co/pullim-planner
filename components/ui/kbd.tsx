import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * CUDS Kbd
 *
 * Keyboard shortcut display. Renders the semantic <kbd> element with a
 * monospace font, sunken surface, subtle border, and small radius — fully
 * tokenized so theme variants (a/b/c) and dark mode flow through.
 *
 * Compose multiple keys with the same parent text container, e.g.
 *   <span><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
 */
const kbdVariants = cva(
  // font-[family-name:…] 은 Tailwind 가 font-family/font-weight 를 구분하지 못하는
  // var() 값에 타입을 못박는 형태다. font-mono 유틸리티는 쓰지 않는다 —
  // 그쪽은 feature-settings 까지 얹어 기존 렌더와 달라진다.
  "inline-flex items-center justify-center font-[family-name:var(--font-mono)] tracking-[var(--tracking-kr-body)] font-medium leading-none whitespace-nowrap select-none align-middle border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] rounded-[var(--radius-xs)]",
  {
    variants: {
      size: {
        sm: "h-[18px] min-w-[18px] px-1 text-[length:var(--text-xs)]",
        md: "h-[22px] min-w-[22px] px-1.5 text-[length:var(--text-xs)]",
        lg: "h-[26px] min-w-[26px] px-2 text-[length:var(--text-sm)]",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface KbdProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof kbdVariants> {}

export const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, size, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(kbdVariants({ size }), className)}
        {...props}
      />
    );
  }
);
Kbd.displayName = "Kbd";
