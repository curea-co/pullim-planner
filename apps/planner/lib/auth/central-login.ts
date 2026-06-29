/**
 * 중앙 로그인(SSO) URL — 플랫폼 OS 로그인으로 위임.
 *
 * 미인증 시 여기로 보내고(`?next=` 에 복귀 URL), OS가 로그인 후 `next` 로 돌려보내면
 * 쿠키 세션(같은 `*.pullim.ai`/`*.pullim.local` 등록도메인 = same-site)으로 자동 복원된다.
 *
 * ⚠️ **호스트는 `*.pullim.local`(로컬)·apex(dev·prod)** 여야 한다 — `localhost` 금지(쿠키 공유 불가).
 * **base URL 확정(2026-06-29, 게이트키퍼)**: **`pullim.ai/login`(apex)**. (OS 헤더 로그인 버튼 실측과 일치 —
 * `os.pullim.ai` 아님.) prod 기본값으로 둔다. env(`NEXT_PUBLIC_PULLIM_LOGIN_URL`)로 환경별 전환:
 *    - local: `.env.local` 에 로컬 apex(`http://pullim.local:3001`)
 *    - dev: 배포 env (예: `https://dev.pullim.ai`)
 */
const LOGIN_BASE = process.env.NEXT_PUBLIC_PULLIM_LOGIN_URL ?? 'https://pullim.ai';

/**
 * 현재 위치(또는 지정 `next`)를 `?next=` 로 실은 **중앙 로그인 절대 URL**.
 * client 전용(window 사용) — 서버에선 fallback 경로만.
 */
export function centralLoginUrl(next?: string): string {
  const back =
    next ?? (typeof window !== 'undefined' ? window.location.href : '/planner');
  return `${LOGIN_BASE}/login?next=${encodeURIComponent(back)}`;
}
