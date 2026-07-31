'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  /** 안전도 score (0~100, 높을수록 안전) */
  score: number;
  /** 안전도 < 50일 때만 노출. 그 외에는 null 반환 */
};

/**
 * 임계치 권유 배너 — 11-planner-design.md § 3.2
 * 번아웃 안전도가 위험(< 50)일 때 페이지 상단에 노출.
 *
 * 톤: 위협이 아닌 **선택지를 제공하는 권유형** (07 § 4.5.1 4원칙).
 * - `[블록 줄이기]` — primary 의도
 * - `[그대로 가기]` — 학생 자율감
 * - `[부모님께 공유]` — 도움 동선
 */
export function BurnoutThresholdBanner({ score }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (score >= 50 || dismissed) return null;

  function onReduceBlock() {
    toast.success('🌙 오늘 저녁 1블록 축소', {
      description: '가장 가벼운 블록 1개를 내일로 이월했어요.',
      duration: 3500,
    });
    setDismissed(true);
  }

  function onShareParent() {
    toast.info('💬 부모님께 회고 공유 준비 중', {
      description: '리포트 페이지에서 동의 후 공유돼요.',
      duration: 3500,
    });
  }

  return (
    <aside
      role="status"
      className="bg-pullim-warn-bg/60 border-pullim-warn/30 flex items-center gap-3 rounded-xl border px-3 py-2.5"
    >
      <span aria-hidden className="shrink-0 text-lg leading-none">🔋</span>
      <p className="text-pullim-slate-900 flex-1 text-xs font-semibold sm:text-sm">
        이번 주 부담이 쌓이고 있어요. 오늘 저녁 1블록 줄여볼까요?
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onReduceBlock}
          className="bg-pullim-warn-cta-bg hover:bg-pullim-warn-cta-bg/90 inline-flex items-center rounded-lg px-2.5 py-2.5 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-warn-cta-bg/40"
        >
          블록 줄이기
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-pullim-slate-700 hover:bg-pullim-slate-100 inline-flex items-center rounded-lg px-2.5 py-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          그대로 가기
        </button>
        <button
          type="button"
          onClick={onShareParent}
          className="hidden sm:inline-flex text-pullim-blue-700 hover:bg-pullim-blue-50 items-center rounded-lg px-2.5 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          부모님께 공유
        </button>
        <button
          type="button"
          aria-label="배너 닫기"
          onClick={() => setDismissed(true)}
          className="text-pullim-slate-500 hover:bg-pullim-slate-100 hover:text-pullim-slate-700 inline-flex h-10 w-10 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
