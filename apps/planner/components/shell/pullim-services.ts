/**
 * 풀림 서비스 레지스트리 — OS 공통 헤더 '서비스 전환' 스위처용.
 * **정본 = pullim-web `src/lib/os-services.ts` + `src/lib/auth/config.ts`** 를 미러한다.
 *
 * 각 서비스는 OS 하위 경로가 아니라 **독립 서브도메인 앱**(q.pullim.ai·writing.pullim.ai 등)이다.
 * URL 은 정본과 동일하게 **OS 티어에서 파생**한다(2026-07-12 — 스위처가 `os.pullim.ai/q` 등
 * 존재하지 않는 OS 하위 경로로 보내던 오배선 수정):
 *   - 티어 앵커 = `NEXT_PUBLIC_PULLIM_OS_URL`(플래너가 이미 환경별로 주입하는 값).
 *     `dev-os…` → dev · `.local`/`localhost` → local · 그 외 → prod · **미설정 → 전 항목 비활성**
 *     (설정 오류를 prod 링크로 가리지 않는 플래너 기존 안전장치 유지)
 *   - 파생: dev → `https://dev-<app>.pullim.ai` · prod → `https://<app>.pullim.ai` ·
 *     **local → 형제 앱 비활성**(로컬 `*.pullim.local` 인증이 prod 와 공유되지 않아 이탈 방지)
 * 회원 access 쿠키는 `Domain=.pullim.ai` 라 톱레벨 하드 내비게이션이면 자동 동반된다(정본 주석).
 */
const OS_BASE = process.env.NEXT_PUBLIC_PULLIM_OS_URL;

if (!OS_BASE && typeof window !== 'undefined') {
  console.warn(
    '[pullim-services] NEXT_PUBLIC_PULLIM_OS_URL 미설정 — 비-플래너 서비스 전환 비활성(환경별 설정 필요).',
  );
}

/** 정본 `osTier()` 미러 — 티어 앵커는 OS origin. */
function osTier(): 'dev' | 'prod' | 'local' {
  if (!OS_BASE || OS_BASE.includes('localhost') || OS_BASE.includes('.local')) return 'local';
  return OS_BASE.replace(/^https?:\/\//, '').startsWith('dev-') ? 'dev' : 'prod';
}

/**
 * 정본 `siblingAppUrl()` 미러 — dev 티어면 dev-<app>, prod 면 <app> 서브도메인.
 * ⚠️ 플래너 안전장치 2가지(Codex #147):
 *   - **미설정** → undefined(비활성 '준비 중' + warn) — 설정 오류를 prod 링크로 가리지 않는다.
 *   - **local 티어** → undefined(비활성) — 로컬 인증은 `*.pullim.local` 쿠키라 prod 앱과
 *     공유되지 않아, 스위처가 로컬 검증 세션을 prod 로 이탈시키는 회귀를 막는다.
 *     (정본 OS 는 local 에서 앱별 .env.local 명시 URL 로 해결하지만 플래너엔 앱별 env 가 없다.)
 */
function siblingAppUrl(app: string): string | undefined {
  const tier = osTier();
  if (!OS_BASE || tier === 'local') return undefined;
  return tier === 'dev' ? `https://dev-${app}.pullim.ai` : `https://${app}.pullim.ai`;
}

/** OS 홈 origin — OS_BASE 미설정이면 undefined(비활성 — 위 안전장치와 동일). */
function osHomeUrl(): string | undefined {
  return OS_BASE ? OS_BASE.replace(/\/$/, '') : undefined;
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
 * 개통 근거(2026-07-12) — live 링크는 아래 두 근거 중 하나로만 열었다:
 *   ① 사용자(제품 오너) 개통 지정: 문제큐(q)·라이팅 코치(writing)·스튜디오(studio)·아케이드(arcade)
 *   ② 실서비스 실측 확인(title): 클래스봇("풀림 클래스봇")·주니어("풀림 주니어")·입시 코치
 *      ("Pullim Admissions Coach")·게임즈(기존 목록에서도 live)
 * 스토어만 근거 밖 — 개통 확인 전까지 soon 유지.
 */
const SERVICE_ENTRIES: PullimService[] = [
  { key: 'planner', name: '플래너', desc: '내 공부, 내가 설계한다.', icon: { img: '/os/icons/03_planner.svg' }, href: '/planner', current: true },
  sibling({ key: 'classbot', name: '클래스봇', desc: '선생님의 분신을 만든다.', icon: { img: '/os/icons/04_classbot.svg' }, app: 'classbot' }),
  sibling({ key: 'q', name: '문제큐', desc: '풀고, 틀리고, 다시 자라난다.', icon: { img: '/os/icons/05_q.svg' }, app: 'q' }),
  sibling({ key: 'games', name: '게임즈', desc: '숙제 끝나고 30분 더 한다.', icon: { img: '/os/icons/06_games.svg' }, app: 'games', path: '/games' }),
  sibling({ key: 'writing', name: '라이팅 코치', desc: '한 줄, 한 단락이 더 좋아진다.', icon: { img: '/os/icons/08_writing.svg' }, app: 'writing' }),
  sibling({ key: 'exam', name: '입시 코치', desc: '입시 준비를 데이터로 한다.', icon: { img: '/os/icons/07_exam.svg' }, app: 'admissions' }),
  { key: 'store', name: '스토어', desc: '검증된 콘텐츠만 사고 판다.', icon: { img: '/os/icons/02_store.svg' }, soon: true },
  sibling({ key: 'studio', name: '스튜디오', desc: '제작은 AI가, 검증은 사람이.', icon: { img: '/os/icons/01_studio.svg' }, app: 'studio' }),
  sibling({ key: 'junior', name: '주니어', desc: '초등, 즐겁게 시작하는 첫 학습.', icon: { img: '/os/icons/pullim.svg' }, app: 'jr' }),
  sibling({ key: 'arcade', name: '아케이드', desc: '무료로 즐기는 학습 아케이드.', icon: { img: '/os/icons/06_games.svg' }, app: 'arcade' }),
];

export const PULLIM_SERVICES: PullimService[] = [
  // 정본 스위처와 동일하게 개수는 목록에서 파생 — 하드코딩 "8개"가 카탈로그와 어긋나지 않게(Codex).
  { key: 'os', name: 'OS 홈', desc: `${SERVICE_ENTRIES.length}개 서비스 한 곳에서`, icon: { char: '⌂' }, href: osHomeUrl(), soon: !OS_BASE },
  ...SERVICE_ENTRIES,
];

/** 현재 서비스(플래너) */
export const CURRENT_SERVICE = PULLIM_SERVICES.find((s) => s.current)!;
