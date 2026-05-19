'use client';

import { CheckCircle2, ArrowRight } from 'lucide-react';
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type Planner } from '@/lib/mock';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  current: Planner | null;
  target: Planner | null;
  onConfirm: () => void;
};

/** 활성 시간표 변경 confirm — 학생이 신중하게 결정하도록 */
export function ActivateConfirmDialog({ open, onOpenChange, current, target, onConfirm }: Props) {
  if (!target) {
    return (
      <Dialog open={false} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
        <DialogContent className="hidden" />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="text-pullim-blue-600 text-[10px] font-bold tracking-wider uppercase">
            <CheckCircle2 aria-hidden className="mr-1 inline-block h-3 w-3" />
            활성 시간표 변경
          </span>
          <DialogTitle>이 시간표를 지금부터 사용하시겠어요?</DialogTitle>
          <DialogDescription>
            홈의 시간표가 즉시 갱신되고, 오늘 블록·진행률·인사이트가 새 시간표 기준으로 표시돼요.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        <section className="bg-pullim-slate-50 flex items-center gap-3 rounded-lg p-3">
          {current && (
            <>
              <div className="min-w-0 flex-1">
                <div className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">현재 활성</div>
                <div className="text-pullim-slate-900 truncate text-sm font-bold">{current.name}</div>
              </div>
              <ArrowRight className="text-pullim-slate-400 h-4 w-4" aria-hidden />
            </>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-pullim-blue-600 text-[10px] font-bold tracking-wider uppercase">변경 후</div>
            <div className="text-pullim-slate-900 truncate text-sm font-bold">{target.name}</div>
          </div>
        </section>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-pullim-blue-600 text-white hover:bg-pullim-blue-700"
          >
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            활성화
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
