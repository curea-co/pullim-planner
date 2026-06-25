"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Donut — center-labeled ring chart. (순수 SVG, no Recharts · --text-* 토큰만 · SSR-safe)
 *
 * PUDS(@puds/donut) **vendoring** — Phase 2 차트 도입 파일럿.
 * 원본: pullim-design-system/packages/ui/charts/donut.tsx
 * 재싱크 절차: 원본을 cp → ① `@/lib/cn`→`@/lib/utils` ② `defaultColors`를 플래너 PUDS 토큰으로 교체
 *   (원본의 `--chart-cat-*`는 플래너 미정의) 재적용. 업스트림 변경 시 위 2개만 다시 맞추면 됨.
 */

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

export interface DonutProps {
  segments: DonutSegment[];
  /** Outer diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  thickness?: number;
  /** Headline content in the center hole. */
  centerLabel?: React.ReactNode;
  centerSubLabel?: React.ReactNode;
  /** Display legend below the chart. */
  showLegend?: boolean;
  className?: string;
  ariaLabel?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, rInner: number, start: number, end: number): string {
  const large = end - start > 180 ? 1 : 0;
  const so = polarToCartesian(cx, cy, r, start);
  const eo = polarToCartesian(cx, cy, r, end);
  const si = polarToCartesian(cx, cy, rInner, end);
  const ei = polarToCartesian(cx, cy, rInner, start);
  return [
    `M ${so.x} ${so.y}`,
    `A ${r} ${r} 0 ${large} 1 ${eo.x} ${eo.y}`,
    `L ${si.x} ${si.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${ei.x} ${ei.y}`,
    `Z`,
  ].join(" ");
}

// 플래너 정합: 원본 PUDS는 `--chart-cat-1..8`을 쓰는데 플래너엔 그 토큰이 없어
// color 누락 시 segment가 투명해진다 → 플래너에 존재하는 PUDS 토큰으로 폴백 교체(footgun 제거).
const defaultColors = [
  "var(--color-primary-600)",
  "var(--color-secondary-500)",
  "var(--color-success-600)",
  "var(--color-warning-600)",
  "var(--color-danger-600)",
  "var(--color-primary-300)",
  "var(--color-gray-500)",
  "var(--color-gray-300)",
];

export const Donut = React.forwardRef<HTMLDivElement, DonutProps>(
  (
    {
      segments,
      size = 200,
      thickness = 28,
      centerLabel,
      centerSubLabel,
      showLegend = true,
      className,
      ariaLabel = "도넛 차트",
    },
    ref
  ) => {
    const total = segments.reduce((s, x) => s + x.value, 0);
    const cx = size / 2;
    const cy = size / 2;
    const rOuter = size / 2 - 1;
    const rInner = rOuter - thickness;

    let acc = 0;
    return (
      <div ref={ref} className={cn("inline-flex flex-col items-center gap-3", className)} lang="ko">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
            {segments.map((seg, i) => {
              const startAngle = (acc / total) * 360;
              acc += seg.value;
              const endAngle = (acc / total) * 360;
              const path =
                Math.abs(endAngle - startAngle) >= 360
                  ? // Full circle: draw two halves to avoid degenerate path
                    arcPath(cx, cy, rOuter, rInner, 0, 180) +
                    " " +
                    arcPath(cx, cy, rOuter, rInner, 180, 359.99)
                  : arcPath(cx, cy, rOuter, rInner, startAngle, endAngle);
              return (
                <path
                  key={seg.label}
                  d={path}
                  fill={seg.color ?? defaultColors[i % defaultColors.length]}
                >
                  <title>{`${seg.label} · ${seg.value} (${((seg.value / total) * 100).toFixed(1)}%)`}</title>
                </path>
              );
            })}
          </svg>
          {(centerLabel || centerSubLabel) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {centerLabel && (
                <div
                  className="text-[var(--text-primary)] font-bold tabular-nums"
                  style={{ fontSize: size * 0.16, letterSpacing: "-0.03em", lineHeight: 1 }}
                >
                  {centerLabel}
                </div>
              )}
              {centerSubLabel && (
                <div
                  className="text-[var(--text-secondary)] text-[length:var(--text-xs)] mt-1"
                  style={{ letterSpacing: "-0.005em" }}
                >
                  {centerSubLabel}
                </div>
              )}
            </div>
          )}
        </div>
        {showLegend && (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[length:var(--text-xs)] list-none p-0 m-0">
            {segments.map((seg, i) => (
              <li key={seg.label} className="flex items-center gap-2 tabular-nums">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: seg.color ?? defaultColors[i % defaultColors.length] }}
                  aria-hidden="true"
                />
                <span className="text-[var(--text-secondary)] truncate" style={{ letterSpacing: "-0.005em" }}>
                  {seg.label}
                </span>
                <span className="ml-auto font-semibold text-[var(--text-primary)]">
                  {Math.round((seg.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
);
Donut.displayName = "Donut";
