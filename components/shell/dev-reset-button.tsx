'use client';

import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { resetMockState } from '@/lib/mock';
import { pullimSession } from '@/lib/auth/pullim-session-client';

/**
 * 개발자 — 사용자의 "가장 처음 사이트 접근" 상태로 리셋.
 *
 * 신규 사용자의 첫 접근 여정(로그인 랜딩 → 온보딩)을 반복 시연하기 위한 dev 전용 버튼.
 * 클릭 시:
 * - pullim 쿠키 세션 로그아웃(`pullimSession.logout` — 서버가 HttpOnly 쿠키 무효화) + 잔여 자체 BE
 *   localStorage 토큰 제거 → 비로그인 확정 (흡수 §10: 세션은 쿠키라 JS 로 못 지우고 서버 로그아웃 필요)
 * - planner 시드 복원 (resetMockState)
 * - /login 으로 hard reload → AuthProvider 재부팅, 모든 모듈 인스턴스 fresh
 *
 * 그 결과: 로그인(랜딩)부터 다시 시작. 온보딩 노출 여부는 재로그인한 계정의 서버 프로필 상태가
 * 결정한다(/planner/me 404 → 온보딩). dev 에서 온보딩을 반복 시연하려면 프로필 없는 시드 계정 사용.
 *
 * 노출 가드 (codex review #39):
 * - 기본은 비-production 환경에서만 노출 → 실서비스에서 실수 클릭으로 세션이
 *   즉시 초기화되는 것을 방지한다.
 * - 데모 배포에서 의도적으로 노출하려면 `NEXT_PUBLIC_ENABLE_DEV_RESET=true` 로
 *   명시 opt-in 한다.
 *
 * 전역(root layout)에 마운트되어 로그인/가입 화면에서도 보인다. 톤다운 floating
 * 버튼으로 UI 침해 최소화.
 */
const DEV_RESET_ENABLED =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_DEV_RESET === 'true';

// 잔여 자체 BE 토큰 키(lib/auth/client.ts TokenStore). pullim 세션은 쿠키라 여기 없지만,
// 가입 보조 등으로 남았을 수 있는 자체 BE 토큰을 확실히 비운다.
const ACCESS_KEY = 'pullim.accessToken';
const REFRESH_KEY = 'pullim.refreshToken';

export function DevResetButton() {
  if (!DEV_RESET_ENABLED) {
    return null;
  }

  function handleClick() {
    toast('첫 접근 상태로 되돌릴까요?', {
      description: '로그아웃 + 시드 복원 → 로그인 화면부터 다시',
      duration: 6000,
      action: {
        label: '처음부터',
        onClick: async () => {
          // pullim 쿠키 세션을 서버에서 무효화한 뒤 **await 하고** 리로드한다. HttpOnly 라 JS 로 못
          // 지우므로 서버 로그아웃이 유일한 클리어 경로인데, await 하지 않고 이동하면 Set-Cookie 가
          // 반영되기 전에 리로드돼 세션이 그대로 복원된다(첫 접근 리셋 계약 위반).
          try {
            await pullimSession.logout();
          } catch {
            // 네트워크/미배포 — 무시(쿠키가 남을 수 있으나 best-effort).
          }
          try {
            localStorage.removeItem(ACCESS_KEY);
            localStorage.removeItem(REFRESH_KEY);
          } catch {
            // localStorage 비활성 브라우저 — 무시
          }
          resetMockState();
          window.location.href = '/login';
        },
      },
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="개발자 — 첫 접근 상태로 리셋"
      title="개발자 — 첫 접근(로그인)부터 다시 보기"
      className="bg-pullim-slate-900/80 hover:bg-pullim-slate-900 focus-visible:ring-pullim-blue-400 fixed right-4 bottom-20 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:bottom-4"
    >
      <RotateCcw className="h-4 w-4" aria-hidden />
    </button>
  );
}
