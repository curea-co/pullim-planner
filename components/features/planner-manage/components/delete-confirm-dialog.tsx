'use client';

import { Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type Planner } from '@/lib/mock';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  target: Planner | null;
  onConfirm: () => void;
};

/** 시간표 삭제 confirm — 영구 삭제. 활성/아카이브가 아닌 경우만 진입 */
export function DeleteConfirmDialog({ open, onOpenChange, target, onConfirm }: Props) {
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
          <span className="text-pullim-danger text-[length:var(--text-xs)] font-bold tracking-wider uppercase">
            <Trash2 aria-hidden className="mr-1 inline-block h-3 w-3" />
            시간표 삭제
          </span>
          <DialogTitle>{target.name} — 영구 삭제</DialogTitle>
          <DialogDescription>
            삭제 후엔 되돌릴 수 없어요. 회고용으로 보존하려면 *아카이브*를 권장해요.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        <aside className="bg-pullim-warn-bg text-pullim-warn flex items-start gap-2 rounded-lg p-3 text-xs">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong className="block">이 시간표의 메타·설정이 모두 삭제돼요</strong>
            <span>리포트의 *지난 회고*에서도 사라집니다.</span>
          </div>
        </aside>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            variant="destructive"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            영구 삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
