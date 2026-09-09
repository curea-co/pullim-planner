/**
 * 풀림 서비스 레지스트리 — OS 공통 헤더 '서비스 전환' 스위처용.
 * **정본 = pullim-web `src/lib/os-services.ts` + `src/lib/auth/config.ts`** 를 미러한다.
 *
 * 각 서비스는 OS 하위 경로가 아니라 **독립 서브도메인 앱**(q.pullim.ai·writing.pullim.ai 등)이다.
 * URL 은 정본과 동일하게 **OS 티어에서 파생**한다(2026-07-12 — 스위처가 `os.pullim.ai/q` 등
 * 존재하지 않는 OS 하위 경로로 보내던 오배선 수정):
 *   - 티어 앵커 = `NEXT_PUBLIC_PULLIM_OS_URL`. `new URL()` 로 검증해 **http/https origin** 이고
 *     **허용 호스트**(`*.pullim.ai` 또는 로컬)일 때만 받는다(부적격·미설정 → 전 항목 비활성
 *     + warn — 설정 오류를 prod 링크로도, 외부 도메인 링크로도 가리지 않는다).
 *   - 파생: OS 홈 호스트 첫 라벨 `[<env>-]os` 의 **env 접두를 그대로 물려받아** 형제 서브도메인으로
 *     교체한다(`dev-os` → `dev-q`, `preview-os` → `preview-q`, `os` → `q`). protocol·port 보존.
 *   - **local → 형제 앱 비활성**(로컬 `*.pullim.local` 인증이 prod 와 공유되지 않아 이탈 방지)
 * 회원 access 쿠키는 `Domain=.pullim.ai` 라 톱레벨 하드 내비게이션이면 자동 동반된다(정본 주석).
 */
const RAW_OS_BASE = process.env.NEXT_PUBLIC_PULLIM_OS_URL;

/**
 * 형제 서비스가 놓일 수 있는 **유일한 도메인**. 파생 호스트가 이 접미사가 아니면 만들지 않는다.
 * (SSO 쿠키가 `Domain=.pullim.ai` 라 이 밖의 호스트로는 세션이 따라가지도 않는다.)
 */
const SERVICE_DOMAIN = '.pullim.ai';

/**
 * OS 홈으로 허용되는 호스트 — 서비스 도메인이거나 로컬 개발 호스트뿐이다.
 *
 * ⚠️ **접미사를 보지 않으면 오설정이 외부 링크가 된다.** `https://os.pullim.ai.evil.example`
 * 은 첫 라벨이 `os` 라 파생 규칙을 통과하고, 나머지(`.pullim.ai.evil.example`)를 그대로
 * 물려받아 `https://q.pullim.ai.evil.example` 를 만든다(Codex #256). 종전 문자열 구현은
 * `https://<app>.pullim.ai` 를 **하드코딩**해 이 성질을 우연히 갖고 있었고, 파생으로 바꾸면서
 * 잃었다 — 명시 검증으로 되살린다.
 *
 * `endsWith` 라 `evil-pullim.ai`·`pullim.ai.evil.example` 은 걸러진다.
 */
function isAllowedHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (hostname === 'pullim.local' || hostname.endsWith('.pullim.local')) return true;
  return hostname === 'pullim.ai' || hostname.endsWith(SERVICE_DOMAIN);
}

/**
 * env 값을 **`new URL()` 로 파싱해 http/https origin 만** 통과시킨다 (정본 `resolveOsHome()`).
 * 여기에 더해 **호스트 허용 목록**까지 본다(`isAllowedHost` — 정본보다 엄격하다).
 *
 * 이 값은 `<a href>` 로 그대로 넘어간다. 종전에는 문자열 `includes()` 로 티어만 보고 원문을
 * 그대로 썼는데, 그러면 상대경로나 `javascript:` 스킴이 주입돼도 걸러지지 않는다 — 검증 없이
 * 링크가 되는 자리다. 파싱에 실패하거나 스킴이 http/https 가 아니면 **미설정과 같이 취급**한다
 * (전 항목 비활성 + warn — 아래 안전장치).
 *
 * `origin` 을 쓰므로 경로·쿼리·해시가 붙어 있어도 origin 만 남는다(종전 `replace(/\/$/,'')` 는
 * 끝 슬래시만 떼어 `https://os.pullim.ai/foo` 를 그대로 통과시켰다).
 */
function resolveOsHome(): string | null {
  if (!RAW_OS_BASE) return null;
  try {
    const u = new URL(RAW_OS_BASE);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!isAllowedHost(u.hostname)) return null;
    return u.origin;
  } catch {
    return null;
  }
}

const OS_HOME = resolveOsHome();

if (!OS_HOME && typeof window !== 'undefined') {
  console.warn(
    RAW_OS_BASE
      ? '[pullim-services] NEXT_PUBLIC_PULLIM_OS_URL 이 http/https origin 이 아니거나 허용 호스트(*.pullim.ai·로컬)가 아니다 — 비-플래너 서비스 전환 비활성.'
      : '[pullim-services] NEXT_PUBLIC_PULLIM_OS_URL 미설정 — 비-플래너 서비스 전환 비활성(환경별 설정 필요).',
  );
}

/**
 * 로컬 티어인가 — 로컬 인증은 `*.pullim.local` 쿠키라 prod 앱과 공유되지 않는다.
 * 검증된 hostname 으로 판정한다(종전에는 원문 문자열 `includes()` 라 경로·쿼리에 `.local` 이
 * 들어 있기만 해도 로컬로 오판할 수 있었다).
 */
function isLocalTier(): boolean {
  if (!OS_HOME) return true;
  const { hostname } = new URL(OS_HOME);
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
}

/**
 * 형제 서비스 origin — OS 홈 origin(`[<env>-]os`)에서 형제 서브도메인을 파생한다
 * (정본 `osServiceUrl()` — `pullim-Q/apps/lib/os-home.ts`).
 *
 *   `https://dev-os.pullim.ai`     + `q` → `https://dev-q.pullim.ai`
 *   `https://preview-os.pullim.ai` + `q` → `https://preview-q.pullim.ai`
 *   `https://os.pullim.ai`         + `q` → `https://q.pullim.ai`
 *
 * ⚠️ **env 접두를 통째로 물려받는다.** 종전에는 `dev-` 만 특별 취급하고 그 외는 전부 prod 로
 * 봤다. 그러면 `preview-os` 에서 **프로덕션 서비스로 유출**된다(비프로덕션 → 프로덕션).
 * `/^(.*-)?os$/` 로 접두 전체를 캡처해 같은 환경의 형제로만 보낸다.
 *
 * ⚠️ **protocol·port 를 보존한다.** `hostname` 만 교체하므로 `http://…:3001` 이 유지된다.
 * 종전에는 `https://` 를 하드코딩해 포트가 유실됐다.
 *
 * 플래너 고유 안전장치 2가지는 그대로 유지한다(Codex #147):
 *   - **미설정·부적격** → undefined(비활성 '준비 중' + warn) — 설정 오류를 prod 링크로 가리지 않는다.
 *   - **local 티어** → undefined(비활성) — 로컬 검증 세션이 prod 로 이탈하는 것을 막는다.
 *     (정본 Q 는 파생 불가 시 OS 홈으로 폴백하지만, 플래너는 그 폴백조차 로컬에선 이탈이 된다.)
 */
function siblingAppUrl(app: string): string | undefined {
  if (!OS_HOME || isLocalTier()) return undefined;
  const u = new URL(OS_HOME);
  const dot = u.hostname.indexOf('.');
  if (dot < 0) return undefined; // 단일 라벨 호스트 — 형제 파생 불가
  const firstLabel = u.hostname.slice(0, dot);
  const rest = u.hostname.slice(dot); // '.pullim.ai' (선행 점 포함)
  if (rest !== SERVICE_DOMAIN) return undefined; // 서비스 도메인이 아니다 — 파생하지 않는다
  const m = firstLabel.match(/^(.*-)?os$/);
  if (!m) return undefined; // `[<env>-]os` 형태가 아니다 — 어느 환경인지 알 수 없으므로 비활성
  u.hostname = `${m[1] ?? ''}${app}${rest}`;
  return u.origin; // hostname 만 교체 → protocol·port 자동 보존
}

/** OS 홈 origin — 미설정·부적격이면 undefined(비활성). 헤더 프로필 메뉴의 OS 설정 링크도 재사용. */
export function osHomeUrl(): string | undefined {
  return OS_HOME ?? undefined;
}

export type PullimService = {
  key: string;
  name: string;
  desc: string;
  /** glyph 아이콘 — img 경로(서비스 아이콘) 또는 단일 문자(예: OS 홈 '⌂') */
  icon: { img: string } | { char: string };
  /** 이동 URL. 비활성(준비중)이면 없음 */
  href?: string;
  /** 현재 서비스(플래너) — 스위처에서 강조 */
  current?: boolean;
  /** 준비 중/비활성 — 흐리게 + '준비 중' 배지 + 진입 차단 */
  soon?: boolean;
};

/**
 * 정본 `OS_SERVICES`(hidden 제외, 카탈로그 순서) 미러 + OS 홈.
 * 이름·설명·경로 모두 정본 그대로 — 게임즈만 `/games` 경로가 붙는다(정본 href 동일).
 */
/** 형제 앱 항목 — href 미해석(OS_BASE 미설정)이면 '준비 중' 비활성으로 강등. */
function sibling(
  s: { key: string; name: string; desc: string; icon: PullimService['icon']; app: string; path?: string },
): PullimService {
  const base = siblingAppUrl(s.app);
  return {
    key: s.key,
    name: s.name,
    desc: s.desc,
    icon: s.icon,
    href: base ? `${base}${s.path ?? ''}` : undefined,
    soon: !base,
  };
}

/**
 * 노출 목록(사용자 확정 2026-07-12 · 주니어 개통 반영 2026-07-29) — 플래너 스위처는 개통된
 * 서비스만 노출한다: 문제큐(q)·라이팅 코치(writing)·스튜디오(studio)·주니어(jr)·아케이드(arcade).
 * (개통에 따라 늘어나므로 **개수는 쓰지 않고 서술로만** 유지 — 하드코딩 개수 금지, Codex #147.)
 * **숨김(완전 비노출)**: 클래스봇·게임즈·입시 코치·스토어·리더 — 정본 hidden(reader)과
 * 동일하게 목록에서 제외(soon 배지 아님). 개통·노출 결정 시 sibling() 항목으로 되살린다:
 *   classbot=app 'classbot' · games=app 'games'+path '/games' · exam=app 'admissions' ·
 *   store=app 'store' (이름·설명은 정본 os-services.ts 참조)
 */
const SERVICE_ENTRIES: PullimService[] = [
  { key: 'planner', name: '플래너', desc: '내 공부, 내가 설계한다.', icon: { img: '/os/icons/03_planner.svg' }, href: '/planner', current: true },
  sibling({ key: 'q', name: '문제큐', desc: '풀고, 틀리고, 다시 자라난다.', icon: { img: '/os/icons/05_q.svg' }, app: 'q' }),
  sibling({ key: 'writing', name: '라이팅 코치', desc: '한 줄, 한 단락이 더 좋아진다.', icon: { img: '/os/icons/08_writing.svg' }, app: 'writing' }),
  sibling({ key: 'studio', name: '스튜디오', desc: '제작은 AI가, 검증은 사람이.', icon: { img: '/os/icons/01_studio.svg' }, app: 'studio' }),
  sibling({ key: 'junior', name: '주니어', desc: '초등, 즐겁게 시작하는 첫 학습.', icon: { img: '/os/icons/jr.svg' }, app: 'jr' }),
  sibling({ key: 'arcade', name: '아케이드', desc: '무료로 즐기는 학습 아케이드.', icon: { img: '/os/icons/arcade.svg' }, app: 'arcade' }),
];

export const PULLIM_SERVICES: PullimService[] = [
  // 개수 표현 없음 — 플래너 스위처는 개통 서비스만 노출(위 주석)하므로 목록 길이가 OS 홈의
  // 실제 서비스 수와 다르다. 어긋나는 숫자 대신 서술형으로(하드코딩 개수 금지, Codex #147).
  { key: 'os', name: 'OS 홈', desc: '풀림 서비스 한 곳에서', icon: { char: '⌂' }, href: osHomeUrl(), soon: !OS_HOME },
  ...SERVICE_ENTRIES,
];

/** 현재 서비스(플래너) */
export const CURRENT_SERVICE = PULLIM_SERVICES.find((s) => s.current)!;
