/**
 * 중앙 로그인(SSO) URL — 플랫폼 OS 로그인으로 위임.
 *
 * 미인증 시 여기로 보내고(`?next=` 에 복귀 URL), OS가 로그인 후 `next` 로 돌려보내면
 * 쿠키 세션(같은 `*.pullim.ai`/`*.pullim.local` 등록도메인 = same-site)으로 자동 복원된다.
 *
 * ⚠️ **호스트는 `*.pullim.local`(로컬)·apex(dev·prod)** 여야 한다 — `localhost` 금지(쿠키 공유 불가).
 * **base URL 확정(2026-06-29, 게이트키퍼)**: **`pullim.ai/login`(apex)**. (OS 헤더 로그인 버튼 실측과 일치 —
 * `os.pullim.ai` 아님.) 게이트키퍼 모델 = **환경마다 셋팅** → `NEXT_PUBLIC_PULLIM_LOGIN_URL` 을 **환경별 필수**로 둔다:
 *    - local: `.env.local` → `http://pullim.local:3001` / dev: 배포 env / prod: `https://pullim.ai`
 * ⚠️ **코드 기본값(prod 폴백) 없음**: env 누락 시 prod 로 잘못 튀면(비운영→운영) 쿠키 도메인 불일치로 복귀 후
 *    세션이 안 살아난다. 따라서 **미설정이면 명시적으로 실패**시켜 조용한 오배선을 즉시 드러낸다(Codex).
 */
const LOGIN_BASE = process.env.NEXT_PUBLIC_PULLIM_LOGIN_URL;

/**
 * SSO 쿠키 공유 가능한 **등록도메인 화이트리스트**. 쿠키는 `Domain=.pullim.ai`/`.pullim.local` 로 묶이므로
 * 이 도메인(apex 또는 서브도메인)만 공유된다. blocklist(localhost만 제외)로는 `*.vercel.app`·임의 호스트가
 * SSO 가능으로 잘못 분류돼 복귀 후 쿠키를 못 읽고 `/login` 루프가 난다(Codex) → 명시적 allowlist.
 */
const SSO_HOST_DOMAINS = ['pullim.ai', 'pullim.local'];

/**
 * 현재 호스트가 SSO 가능(쿠키 공유)한가 — `pullim.ai`/`pullim.local`(apex·서브도메인)이면 true.
 * 그 외(localhost·`*.vercel.app`·임의 호스트)는 false: 중앙 로그인으로 보내면 복귀 후 쿠키를 못 읽어
 * **무한 루프**가 나므로 호출부에서 가드한다. (SSR(window 없음)에선 false — 'loading' 단계라 분기 미도달.)
 */
export function isSsoCapableHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return SSO_HOST_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
}

/**
 * 현재 위치(또는 지정 `next`)를 `?next=` 로 실은 **중앙 로그인 절대 URL**.
 * client 전용(window 사용) — 서버에선 fallback 경로만.
 * `next` = 진입한 페이지 전체 URL(환경별 planner 도메인 자동) — 게이트키퍼: 비우지 말 것.
 */
export function centralLoginUrl(next?: string): string {
  if (!LOGIN_BASE) {
    // 환경별 env 미설정 = 배선 오류. prod 자동 폴백 대신 명시적 실패(LOUD)로 즉시 드러낸다.
    throw new Error(
      '[central-login] NEXT_PUBLIC_PULLIM_LOGIN_URL 미설정 — 환경별(local/dev/prod) 중앙 로그인 base 를 설정해야 합니다(localhost 금지·prod 자동 폴백 없음).',
    );
  }
  const back =
    next ?? (typeof window !== 'undefined' ? window.location.href : '/planner');
  return `${LOGIN_BASE}/login?next=${encodeURIComponent(back)}`;
}
