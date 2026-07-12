/**
 * 풀림 서비스 레지스트리 — OS 공통 헤더 '서비스 전환' 스위처용.
 * **정본 = pullim-web `src/lib/os-services.ts` + `src/lib/auth/config.ts`** 를 미러한다.
 *
 * 각 서비스는 OS 하위 경로가 아니라 **독립 서브도메인 앱**(q.pullim.ai·writing.pullim.ai 등)이다.
 * URL 은 정본과 동일하게 **OS 티어에서 파생**한다(2026-07-12 — 스위처가 `os.pullim.ai/q` 등
 * 존재하지 않는 OS 하위 경로로 보내던 오배선 수정):
 *   - 티어 앵커 = `NEXT_PUBLIC_PULLIM_OS_URL`(플래너가 이미 환경별로 주입하는 값).
 *     `dev-os…` → dev · `.local`/`localhost`/미설정 → local · 그 외 → prod
 *   - 파생: dev → `https://dev-<app>.pullim.ai` · 그 외(local 포함) → `https://<app>.pullim.ai`
 *     (정본 `siblingAppUrl` 과 동일 — local 은 독립 앱들이 로컬에 없어 prod 로 향한다.)
 * 회원 access 쿠키는 `Domain=.pullim.ai` 라 톱레벨 하드 내비게이션이면 자동 동반된다(정본 주석).
 */
const OS_BASE = process.env.NEXT_PUBLIC_PULLIM_OS_URL;

/** 정본 `osTier()` 미러 — 티어 앵커는 OS origin. */
function osTier(): 'dev' | 'prod' | 'local' {
  if (!OS_BASE || OS_BASE.includes('localhost') || OS_BASE.includes('.local')) return 'local';
  return OS_BASE.replace(/^https?:\/\//, '').startsWith('dev-') ? 'dev' : 'prod';
}

/** 정본 `siblingAppUrl()` 미러 — dev 티어면 dev-<app>, 그 외 <app> 서브도메인. */
function siblingAppUrl(app: string): string {
  return osTier() === 'dev' ? `https://dev-${app}.pullim.ai` : `https://${app}.pullim.ai`;
}

/** OS 홈 origin — 미설정이면 prod 정본(배포 빌드가 localhost 로 새지 않게, 정본 `osUrl()` 동작). */
function osHomeUrl(): string {
  return (OS_BASE ?? 'https://os.pullim.ai').replace(/\/$/, '');
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
export const PULLIM_SERVICES: PullimService[] = [
  { key: 'os', name: 'OS 홈', desc: '8개 서비스 한 곳에서', icon: { char: '⌂' }, href: osHomeUrl() },
  { key: 'planner', name: '플래너', desc: '내 공부, 내가 설계한다.', icon: { img: '/os/icons/03_planner.svg' }, href: '/planner', current: true },
  { key: 'classbot', name: '클래스봇', desc: '선생님의 분신을 만든다.', icon: { img: '/os/icons/04_classbot.svg' }, href: siblingAppUrl('classbot') },
  { key: 'q', name: '문제큐', desc: '풀고, 틀리고, 다시 자라난다.', icon: { img: '/os/icons/05_q.svg' }, href: siblingAppUrl('q') },
  { key: 'games', name: '게임즈', desc: '숙제 끝나고 30분 더 한다.', icon: { img: '/os/icons/06_games.svg' }, href: `${siblingAppUrl('games')}/games` },
  { key: 'writing', name: '라이팅 코치', desc: '한 줄, 한 단락이 더 좋아진다.', icon: { img: '/os/icons/08_writing.svg' }, href: siblingAppUrl('writing') },
  { key: 'exam', name: '입시 코치', desc: '입시 준비를 데이터로 한다.', icon: { img: '/os/icons/07_exam.svg' }, href: siblingAppUrl('admissions') },
  { key: 'store', name: '스토어', desc: '검증된 콘텐츠만 사고 판다.', icon: { img: '/os/icons/02_store.svg' }, href: siblingAppUrl('store') },
  { key: 'studio', name: '스튜디오', desc: '제작은 AI가, 검증은 사람이.', icon: { img: '/os/icons/01_studio.svg' }, href: siblingAppUrl('studio') },
  { key: 'junior', name: '주니어', desc: '초등, 즐겁게 시작하는 첫 학습.', icon: { img: '/os/icons/pullim.svg' }, href: siblingAppUrl('jr') },
  { key: 'arcade', name: '아케이드', desc: '무료로 즐기는 학습 아케이드.', icon: { img: '/os/icons/06_games.svg' }, href: siblingAppUrl('arcade') },
];

/** 현재 서비스(플래너) */
export const CURRENT_SERVICE = PULLIM_SERVICES.find((s) => s.current)!;
