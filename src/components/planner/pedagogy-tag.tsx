'use client';

import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { pedagogyEngineMeta, type PedagogyEngineId } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 교육학 엔진 태그 — 블록 카드에 부착 (핸드오프 4.2).
 * 클릭 시 "왜 이 엔진?" 원리 설명 모달 (교육적 투명성).
 *
 * shadcn Dialog 기반 — ESC 닫기 / focus-trap / overlay click / motion-reduce 자동 처리.
 */
export function PedagogyTag({ engineId, size = 'sm' }: { engineId: PedagogyEngineId; size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false);
  const meta = pedagogyEngineMeta[engineId];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${meta.label} 엔진 설명 보기`}
        className={cn(
          'bg-pullim-blue-50 text-pullim-blue-700 hover:bg-pullim-blue-100 inline-flex items-center gap-1 rounded-full font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1',
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        )}
      >
        <GraduationCap className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        {meta.label}
      </button>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <span className="text-pullim-blue-600 text-[10px] font-semibold tracking-wider uppercase">
            교육학 엔진
          </span>
          <DialogTitle className="flex items-center gap-2">
            <span className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex h-7 w-7 items-center justify-center rounded-lg">
              <GraduationCap className="h-4 w-4" aria-hidden />
            </span>
            {meta.label}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {meta.label} 엔진의 원리와 적용 예시
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <div className="text-pullim-slate-500 mb-1 text-[11px] font-semibold tracking-wider uppercase">원리</div>
            <p className="text-pullim-slate-700 leading-relaxed">{meta.principle}</p>
          </div>
          <div>
            <div className="text-pullim-slate-500 mb-1 text-[11px] font-semibold tracking-wider uppercase">예시</div>
            <p className="text-pullim-slate-700 bg-pullim-blue-50 rounded-lg p-2.5 text-xs leading-relaxed">
              {meta.example}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
