/**
 * 풀림 서비스 레지스트리 — OS 공통 헤더 '서비스 전환' 스위처용.
 * OS(pullim-web) 헤더의 서비스 목록을 그대로 차용. 플래너가 현재 서비스(`current`).
 *
 * 비-플래너 서비스는 OS 호스트(env `NEXT_PUBLIC_PULLIM_OS_URL`)에 산다.
 * ⚠️ **코드 기본값(로컬 폴백) 없음**: 로컬 폴백을 두면 dev/prod 에서 env 누락 시 전 링크가 localhost 로
 *    향해 배포에서만 깨진다(LOGIN_URL 과 동일 원칙·Codex). **미설정이면 비-플래너를 '준비 중'(비활성)으로** 둔다.
 *    local: `.env.local` → http://os.pullim.local:3001 / dev·prod: 배포 env (예: https://os.pullim.ai)
 */
const OS_BASE = process.env.NEXT_PUBLIC_PULLIM_OS_URL;

if (!OS_BASE && typeof window !== 'undefined') {
  console.warn(
    '[pullim-services] NEXT_PUBLIC_PULLIM_OS_URL 미설정 — 비-플래너 서비스 전환 비활성(환경별 설정 필요).',
  );
}

export type PullimService = {
  key: string;
  name: string;
  desc: string;
  /** glyph 아이콘 — img 경로(서비스 아이콘) 또는 단일 문자(예: OS 홈 '⌂') */
  icon: { img: string } | { char: string };
  /** 이동 URL. 비활성(준비중·OS 호스트 미설정)이면 없음 */
  href?: string;
  /** 현재 서비스(플래너) — 스위처에서 강조 */
  current?: boolean;
  /** 준비 중/비활성 — 흐리게 + '준비 중' 배지 + 진입 차단 */
  soon?: boolean;
};

/** OS 호스트가 필요한 비-플래너 서비스. OS_BASE 없으면 href 생략 + 비활성. */
function osService(
  s: { key: string; name: string; desc: string; icon: PullimService['icon']; path: string; soon?: boolean },
): PullimService {
  const blocked = !OS_BASE || s.soon;
  return {
    key: s.key,
    name: s.name,
    desc: s.desc,
    icon: s.icon,
    href: OS_BASE ? `${OS_BASE}${s.path}` : undefined,
    soon: blocked,
  };
}

export const PULLIM_SERVICES: PullimService[] = [
  osService({ key: 'os', name: 'OS 홈', desc: '8개 서비스 한 곳에서', icon: { char: '⌂' }, path: '/' }),
  { key: 'planner', name: '플래너', desc: '내 공부, 내가 설계한다.', icon: { img: '/os/icons/03_planner.svg' }, href: '/planner', current: true },
  osService({ key: 'classbot', name: '클래스봇', desc: '선생님의 분신을 만든다.', icon: { img: '/os/icons/04_classbot.svg' }, path: '/classbot', soon: true }),
  osService({ key: 'q', name: '문제 Q', desc: '풀고, 틀리고, 다시 자라난다.', icon: { img: '/os/icons/05_q.svg' }, path: '/q', soon: true }),
  osService({ key: 'games', name: '게임즈', desc: '숙제 끝나고 30분 더 한다.', icon: { img: '/os/icons/06_games.svg' }, path: '/games' }),
  osService({ key: 'store', name: '스토어', desc: '검증된 콘텐츠만 사고 판다.', icon: { img: '/os/icons/02_store.svg' }, path: '/store', soon: true }),
  osService({ key: 'reader', name: '리더', desc: '내 자료 가져와 필기하는 학습 노트앱.', icon: { img: '/os/icons/10_reader.svg' }, path: '/reader', soon: true }),
  osService({ key: 'studio', name: '스튜디오', desc: '제작은 AI가, 검증은 사람이.', icon: { img: '/os/icons/01_studio.svg' }, path: '/studio', soon: true }),
];

/** 현재 서비스(플래너) */
export const CURRENT_SERVICE = PULLIM_SERVICES.find((s) => s.current)!;
