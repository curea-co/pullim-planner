'use client';

import { Heart, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { BurnoutFactor, BurnoutSnapshot } from '@/lib/mock';
import { cn } from '@/lib/utils';

const trendIcon = {
  rising:  { Icon: TrendingUp,   color: 'text-pullim-success', label: '회복 중' },
  stable:  { Icon: Minus,        color: 'text-pullim-slate-500', label: '안정' },
  falling: { Icon: TrendingDown, color: 'text-pullim-warn', label: '주의' },
} as const;

const factorStatusColor = {
  good: 'text-pullim-success',
  warn: 'text-pullim-warn',
  bad:  'text-pullim-danger',
} as const;

function formatFactor(f: BurnoutFactor): string {
  return f.unit === '/5' ? `${f.value}/5` : `${f.value}${f.unit}`;
}

/**
 * QA #14 — 노출 지표 제외 목록 (안정 id 기준 — 카피 변경에 안전).
 * sleep(평균 수면 시간)은 사용자 입력이 필요한 값이라 현 데이터로는 추정치(노이즈)이고,
 * rest_usage("쉴래요" 사용)는 해당 기능(QA #15) 제거로 무의미. 유지: streak·emotion·rest_acceptance.
 */
const HIDDEN_FACTOR_IDS = new Set<BurnoutFactor['id']>(['sleep', 'rest_usage']);

/**
 * 번아웃 지수 카드 — 핸드오프 7.2 (지표 가중 평균).
 * ("오늘은 쉴래요" 1-tap 휴식은 미동작 기능이라 QA #15에서 제거.)
 *
 * `burnout`은 호출부(HomeContainer)가 해석한 스냅샷 — 실모드는 이번 주 완료 기록으로
 * 계산(computeBurnoutFromWeek), dev bypass는 mock. null이면 아직 집계할 기록이 없음.
 */
export function BurnoutCard({ burnout }: { burnout: BurnoutSnapshot | null }) {
  if (!burnout) {
    return (
      <section className="bg-card rounded-xl border p-4 text-center">
        <div className="text-pullim-slate-500 flex items-center justify-center gap-1 text-[11px] font-semibold tracking-wider uppercase">
          <Heart className="h-3 w-3" />
          번아웃 안전도
        </div>
        <p className="text-pullim-slate-500 mt-2 text-xs">
          아직 데이터가 부족해요 — 학습 블록을 완료하면 안전도가 계산돼요.
        </p>
      </section>
    );
  }
  const { score, trend, factors } = burnout;
  const visibleFactors = factors.filter(f => !HIDDEN_FACTOR_IDS.has(f.id));

  const tone = score >= 70 ? 'good' : score >= 50 ? 'warn' : 'bad';
  const ringColor =
    tone === 'good' ? 'var(--color-pullim-success)'
    : tone === 'warn' ? 'var(--color-pullim-warn)'
    : 'var(--color-pullim-danger)';

  const { Icon, color, label } = trendIcon[trend];
  const angle = (score / 100) * 360;

  return (
    <section className="bg-card rounded-xl border p-4">
      <div className="flex items-start gap-4">
        {/* 점수 도넛 — 두께 5px (절반), 배경 ring slate-50로 옅게 */}
        <div
          className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${ringColor} ${angle}deg, var(--color-pullim-slate-50) 0deg)`,
          }}
        >
          <div className="bg-card flex flex-col items-center justify-center rounded-full" style={{ width: 70, height: 70 }}>
            <span className="text-pullim-slate-900 font-mono text-xl font-bold leading-none">{score}</span>
            <span className="text-pullim-slate-500 text-[10px] tracking-wider">/ 100</span>
          </div>
        </div>

        {/* 라벨 */}
        <div className="flex-1">
          <div className="text-pullim-slate-500 flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase">
            <Heart className="h-3 w-3" />
            번아웃 안전도
          </div>
          <div className="text-pullim-slate-900 mt-0.5 text-base font-bold">
            {tone === 'good' ? '컨디션 좋아요' : tone === 'warn' ? '컨디션 살펴볼게요' : '오늘은 쉬어가요'}
          </div>
          <div className={cn('mt-1 inline-flex items-center gap-1 text-xs font-semibold', color)}>
            <Icon className="h-3 w-3" />
            {label}
          </div>
        </div>
      </div>

      {/* 지표 — QA #14 제외 목록 반영 */}
      <ul className="mt-4 space-y-1.5">
        {visibleFactors.map(f => (
          <li key={f.label} className="flex items-center justify-between text-xs">
            <span className="text-pullim-slate-600">{f.label}</span>
            <span className={cn('font-mono font-bold', factorStatusColor[f.status])}>
              {formatFactor(f)}
            </span>
          </li>
        ))}
      </ul>

    </section>
  );
}
