import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * CUDS Skeleton
 *
 * Animated gradient sweeping left-to-right to indicate loading state.
 * Mirrors the `.skeleton` rule in components.css using tokenized colors
 * and a scoped keyframes block (no global CSS dependency).
 *
 * Accepts `className` for sizing (width/height) — defaults to a
 * single 16px-tall bar via tokens.
 */
const skeletonVariants = cva(
  "block rounded-[var(--radius-md)] bg-[length:200%_100%] [animation:cuds-skeleton-sweep_1.4s_ease-in-out_infinite] motion-reduce:animate-none",
  {
    variants: {
      shape: {
        line: "h-4 w-full",
        block: "h-24 w-full",
        circle: "rounded-[var(--radius-full)] aspect-square h-10 w-10",
      },
    },
    defaultVariants: { shape: "line" },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, shape, style, ...props }, ref) => {
    return (
      <>
        {/* Scoped keyframes — kept inline so the primitive is self-contained */}
        <style>{`@keyframes cuds-skeleton-sweep { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
        <div
          ref={ref}
          aria-hidden="true"
          role="presentation"
          className={cn(skeletonVariants({ shape }), className)}
          style={{
            backgroundImage:
              "linear-gradient(90deg, var(--surface-sunken), var(--surface-canvas), var(--surface-sunken))",
            ...style,
          }}
          {...props}
        />
      </>
    );
  }
);
Skeleton.displayName = "Skeleton";

/**
 * SkeletonText
 *
 * Convenience composition for multi-line text placeholders.
 * Last line is shorter to mimic natural prose ragging.
 */
export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

export const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ className, lines = 3, ...props }, ref) => {
    const count = Math.max(1, lines);
    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-2", className)}
        aria-busy="true"
        aria-live="polite"
        {...props}
      >
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(i === count - 1 && count > 1 ? "w-2/3" : "w-full")}
          />
        ))}
        <span className="sr-only" lang="ko">
          불러오는 중
        </span>
      </div>
    );
  }
);
SkeletonText.displayName = "SkeletonText";
