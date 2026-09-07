import { AlertCircle } from 'lucide-react';

type Props = {
  /** 'planner' 시간표 목록 실패(화면 전체가 빈다) · 'blocks' 이 기간의 블록만 실패. */
  scope: 'planner' | 'blocks';
  /** 재조회 진행 중 — 실패 화면을 **치우지 않고** 진행 중임만 알린다. */
  retrying?: boolean;
  onRetry?: () => void;
};

/**
 * 홈 조회 실패 — **"계획이 없음"과 구분하기 위해서만** 존재한다.
 *
 * 기간 조회는 전부 아니면 전무라 실패하면 그 창이 통째로 빈다. 빈 달력은 "이 기간엔 계획이
 * 없다"와 픽셀 단위로 같아서, 사용자는 자기 시간표가 사라졌다고 읽는다. 실패는 실패라고 말한다.
 */
export function HomeLoadFailure({ scope, retrying = false, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="border-pullim-danger/30 bg-pullim-danger-bg/40 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center"
    >
      <AlertCircle className="text-pullim-danger-ink h-8 w-8" aria-hidden />
      <p className="text-pullim-slate-700 text-sm font-bold">
        {scope === 'planner' ? '시간표를 불러오지 못했어요' : '이 기간의 계획을 불러오지 못했어요'}
      </p>
      <p className="text-pullim-slate-500 text-xs">
        계획이 없는 게 아니라 조회가 실패했어요. 잠시 후 다시 시도해 주세요.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 mt-2 rounded-lg px-3.5 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {retrying ? '다시 불러오는 중…' : '다시 시도'}
        </button>
      )}
    </div>
  );
}
