import * as React from "react";
import { cn } from "@/lib/cn";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--pad-lg)] shadow-[var(--shadow-sm)]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      lang="ko"
      className={cn(
        "text-[length:var(--text-lg)] font-[var(--font-weight-h)] tracking-[-0.022em] break-keep",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      lang="ko"
      className={cn(
        "text-[length:var(--text-sm)] text-[var(--text-secondary)] leading-[var(--leading-kr-lead)] break-keep break-words",
        className
      )}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  trend?: "up" | "down";
  className?: string;
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, delta, trend = "up", className }, ref) => (
    <Card ref={ref} className={cn("p-[var(--pad-lg)]", className)}>
      <div className="text-[length:var(--text-sm)] text-[var(--text-secondary)]">{label}</div>
      <div className="text-[length:var(--text-3xl)] font-bold mt-1 tabular-nums tracking-[-0.03em]">
        {value}
      </div>
      {delta && (
        <div
          className={cn(
            "text-[length:var(--text-xs)] mt-1 inline-flex items-center gap-1",
            trend === "up" ? "text-[var(--color-success-600)]" : "text-[var(--color-danger-600)]"
          )}
        >
          <span>{trend === "up" ? "▲" : "▼"}</span>
          {delta}
        </div>
      )}
    </Card>
  )
);
StatCard.displayName = "StatCard";
