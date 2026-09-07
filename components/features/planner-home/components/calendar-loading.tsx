import { Skeleton } from '@/components/ui/skeleton';

/**
 * 달력 본문 로딩 — **「계획이 없어요」와 구분하기 위해서만** 존재한다.
 *
 * 로딩 중에는 `blocksByDate` 가 비어 있고 `active` 도 아직 null 이다. 그대로 그리면 화면이
 * 「이 기간엔 계획이 없어요」와 「아직 시간표가 없어요」를 **확정적으로** 말한다 — 모르는 것을
 * 없다고 말하는 것이고, 합계도 0 으로 떠서 잠깐 스쳐도 오해를 남긴다.
 *
 * 뷰마다 모양이 달라도 자리만 지키면 되므로 한 벌만 둔다 — 세로 리듬만 맞춘다.
 */
export function CalendarLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">계획을 불러오는 중</span>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton shape="block" className="h-40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} shape="block" className="h-20" />
        ))}
      </div>
    </div>
  );
}
