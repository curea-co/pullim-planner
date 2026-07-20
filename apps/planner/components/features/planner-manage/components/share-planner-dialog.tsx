'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type Friend } from '@/lib/mock/studygram';
import { type Planner } from '@/lib/mock';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** 공유할 시간표 (null이면 닫힘) */
  planner: Planner | null;
  /** 선택한 친구 id로 공유 확정 */
  onConfirm: (friendIds: string[]) => void;
  /** 공유 대상 친구 목록 — LNB '공유'와 동일한 실 데이터(getFriends). dev bypass면 mock. */
  friends: Friend[];
  /** 친구 목록 로드 실패(네트워크·401 등) — 빈 목록을 '친구 없음'으로 오표시하지 않게 분기. */
  friendsError?: boolean;
  /** 친구 목록 첫 조회 중 — 로딩을 '친구 없음'으로 오표시하지 않게 분기. */
  friendsLoading?: boolean;
};

/**
 * 시간표 공유 — 친구 다중 선택 모달.
 * 아웃바운드 공유(내 시간표 → 친구). 인바운드 조회는 LNB "공유"(친구가 공유한 시간표).
 */
export function SharePlannerDialog({ open, onOpenChange, planner, onConfirm, friends, friendsError, friendsLoading }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  // 수락된 친구만 공유 대상 (pending/blocked 제외)
  const acceptedFriends = friends.filter((f) => f.status === 'accepted');

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleOpenChange(next: boolean) {
    if (!next) setSelected([]); // 닫으면 선택 초기화
    onOpenChange(next);
  }

  function confirm() {
    onConfirm(selected);
    setSelected([]);
  }

  if (!planner) {
    return (
      <Dialog open={false} onOpenChange={() => onOpenChange(false)}>
        <DialogContent className="hidden" />
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="text-pullim-blue-600 text-[10px] font-bold tracking-wider uppercase">
            <Share2 aria-hidden className="mr-1 inline-block h-3 w-3" />
            시간표 공유
          </span>
          <DialogTitle>
            <span className="font-bold">{planner.name}</span> 공유하기
          </DialogTitle>
          <DialogDescription>
            공유할 친구를 고르세요. 친구는 <strong>공유 &gt; 친구 시간표</strong>에서 보게 돼요.
            <span className="text-pullim-slate-400"> (실제 전달은 준비 중)</span>
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {friendsLoading ? (
            <p className="text-pullim-slate-500 py-8 text-center text-sm">
              친구 목록을 불러오는 중…
            </p>
          ) : friendsError ? (
            <p className="text-pullim-slate-500 py-8 text-center text-sm">
              친구 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
            </p>
          ) : acceptedFriends.length === 0 ? (
            <p className="text-pullim-slate-500 py-8 text-center text-sm">
              아직 친구가 없어요. 공유에서 친구를 추가해 보세요.
            </p>
          ) : (
            <ul role="listbox" aria-label="공유할 친구 선택" aria-multiselectable className="flex flex-col gap-1.5">
              {acceptedFriends.map((f) => {
                const on = selected.includes(f.id);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => toggle(f.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                        on
                          ? 'border-pullim-blue-500 bg-pullim-blue-50'
                          : 'border-pullim-slate-200 hover:bg-pullim-slate-50',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                          on ? 'bg-pullim-blue-600 text-white' : 'bg-pullim-slate-100 text-pullim-slate-600',
                        )}
                      >
                        {f.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-pullim-slate-900 flex items-center gap-1.5 text-sm font-bold">
                          {f.name}
                          {f.isCloseFriend && (
                            <span className="text-pullim-blue-700 bg-pullim-blue-50 rounded px-1 py-0.5 text-[10px] font-bold">
                              친한 친구
                            </span>
                          )}
                        </span>
                        <span className="text-pullim-slate-500 block text-xs">{f.grade}</span>
                      </span>
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          on ? 'border-pullim-blue-600 bg-pullim-blue-600 text-white' : 'border-pullim-slate-300',
                        )}
                        aria-hidden
                      >
                        {on && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            취소
          </Button>
          <Button onClick={confirm} disabled={selected.length === 0}>
            <Share2 className="h-3.5 w-3.5" />
            {selected.length > 0 ? `${selected.length}명에게 공유` : '공유하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
