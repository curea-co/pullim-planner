'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  blockTypeMeta, subjectLabels, getFeatureRoute, getBlockColor,
  type TimeBlock, type PaletteId,
} from '@/lib/mock';

interface NextBlockHeroProps {
  next: TimeBlock;
  /** 풀림 Q 구독 여부 — 미구독 시 CTA가 구독 안내 토스트로 */
  qAccess: boolean;
  /** 좌측 stripe 색 계산용 활성 팔레트 */
  paletteId?: PaletteId;
  onNoAccess: () => void;
}

/**
 * "다음 블록" 히어로 — 홈 day-view 일과 시계 바로 아래.
 * 평면 카드 → 좌측 타입색 4px stripe + 블루 그라데이션 surface + 시작 시각 강조 + 강조 CTA.
 * stripe만 팔레트 동적색(inline) — side-timeline·today-timeline과 동일 패턴. 나머지는 토큰 클래스.
 */
export function NextBlockHero({ next, qAccess, paletteId, onNoAccess }: NextBlockHeroProps) {
  const Icon = blockTypeMeta[next.type].Icon;
  const stripeColor = getBlockColor(next.type, paletteId);

  const ctaCls =
    'bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex w-full shrink-0 items-center justify-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-pullim-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-300 sm:w-auto';

  return (
    <div className="border-pullim-blue-100 from-pullim-blue-50 to-pullim-blue-100/40 shadow-pullim-sm relative mt-4 overflow-hidden rounded-2xl border bg-gradient-to-br p-3 pl-4">
      {/* 좌측 타입색 stripe — 4px 얇은 액센트(가드 안전) */}
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: stripeColor }}
        aria-hidden
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="bg-pullim-blue-100 text-pullim-blue-700 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            aria-hidden
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-pullim-blue-700 text-xs font-bold tracking-wider uppercase">
              다음 블록
            </div>
            <div className="text-pullim-slate-900 truncate text-sm font-bold">{next.title}</div>
            <div className="text-pullim-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1 text-xs">
              <span className="text-pullim-blue-700 font-mono text-sm font-bold">{next.start}</span>
              <span>에 시작</span>
              {next.subject !== 'rest' && (
                <>
                  <span className="mx-0.5">·</span>
                  {subjectLabels[next.subject]}
                </>
              )}
              <span className="mx-0.5">·</span>
              {next.expectedMinutes}분
            </div>
          </div>
        </div>
        {qAccess ? (
          <Link
            href={next.linkedFeatureSlug ? getFeatureRoute(next.linkedFeatureSlug) : '#'}
            className={ctaCls}
          >
            지금 시작해요
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onNoAccess}
            aria-label="풀림 Q 미구독 — 클릭하면 구독 안내가 떠요"
            className={ctaCls}
          >
            지금 시작해요
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
