'use client';

import Link from 'next/link';
import { CalendarX2 } from 'lucide-react';

interface PeriodEmptyStateProps {
  /** 예: "이 날짜엔 아직 계획이 없어요" */
  message: string;
  /** 기준 기간으로 리셋 (미전달 시 버튼 숨김) */
  onReset?: () => void;
  /** 리셋 버튼 라벨 (예: "오늘 계획 보기") */
  resetLabel?: string;
}

/**
 * 캘린더 빈 상태 — 데모 플랜이 없는 기간(일/주/월)에 표시.
 * day/week/month 뷰 공용. BE 연동 시 해당 기간 데이터로 채워진다.
 */
export function PeriodEmptyState({ message, onReset, resetLabel = '오늘 계획 보기' }: PeriodEmptyStateProps) {
  return (
    <div className="border-pullim-slate-200 bg-pullim-slate-50/50 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center">
      <CalendarX2 className="text-pullim-slate-400 h-8 w-8" aria-hidden />
      <p className="text-pullim-slate-700 text-sm font-bold">{message}</p>
      <p className="text-pullim-slate-500 text-xs">빌더에서 시간표를 만들면 이 기간에도 블록이 채워져요.</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center rounded-lg px-3 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-300"
          >
            {resetLabel}
          </button>
        )}
        <Link
          href="/planner/manage"
          className="text-pullim-blue-700 hover:bg-pullim-blue-50 inline-flex items-center rounded-lg px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          시간표 관리
        </Link>
      </div>
    </div>
  );
}
