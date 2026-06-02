'use client';

import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { resetMockState } from '@/lib/mock';

/**
 * 개발자 — 첫 방문자 상태로 리셋.
 *
 * - planner 시드 복원 (resetMockState)
 * - localStorage 'pullim:visited' 제거 → onboarding redirect 가드 재발동
 * - /planner 로 hard reload → 모든 모듈 인스턴스 fresh
 *
 * 노출 가드 (codex review #39):
 * - 기본은 비-production 환경에서만 노출 → 실서비스에서 실수 클릭으로 세션이
 *   즉시 초기화되는 것을 방지한다.
 * - 데모 배포에서 의도적으로 노출하려면 `NEXT_PUBLIC_ENABLE_DEV_RESET=true` 로
 *   명시 opt-in 한다.
 * 톤다운 floating 버튼으로 UI 침해 최소화.
 */
const DEV_RESET_ENABLED =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_DEV_RESET === 'true';

export function DevResetButton() {
  if (!DEV_RESET_ENABLED) {
    return null;
  }

  function handleClick() {
    toast('첫 방문자 상태로 초기화할까요?', {
      description: '플래너 시드 복원 + 방문 기록 삭제 후 새로고침',
      duration: 6000,
      action: {
        label: '초기화',
        onClick: () => {
          resetMockState();
          try {
            localStorage.removeItem('pullim:visited');
          } catch {
            // localStorage 비활성 브라우저 — 무시
          }
          window.location.href = '/planner';
        },
      },
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="개발자 — 초기 상태로 리셋"
      title="개발자 — 초기 상태로 리셋"
      className="bg-pullim-slate-900/80 hover:bg-pullim-slate-900 focus-visible:ring-pullim-blue-400 fixed right-4 bottom-20 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:bottom-4"
    >
      <RotateCcw className="h-4 w-4" aria-hidden />
    </button>
  );
}
