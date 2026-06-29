/**
 * 풀림 서비스 레지스트리 — OS 공통 헤더 '서비스 전환' 스위처용.
 * OS(os.pullim.local:3001) 헤더의 서비스 목록을 그대로 차용. 플래너가 현재 서비스(`current`).
 *
 * 비-플래너 서비스는 OS 호스트(env `NEXT_PUBLIC_PULLIM_OS_URL`)에 산다.
 * 로컬 기본값 = http://os.pullim.local:3001. dev/prod 는 배포 env 로 override.
 */
const OS_BASE = process.env.NEXT_PUBLIC_PULLIM_OS_URL ?? 'http://os.pullim.local:3001';

export type PullimService = {
  key: string;
  name: string;
  desc: string;
  /** glyph 아이콘 — img 경로(서비스 아이콘) 또는 단일 문자(예: OS 홈 '⌂') */
  icon: { img: string } | { char: string };
  href: string;
  /** 현재 서비스(플래너) — 스위처에서 강조 */
  current?: boolean;
  /** 준비 중 — 흐리게 + '준비 중' 배지 */
  soon?: boolean;
};

export const PULLIM_SERVICES: PullimService[] = [
  { key: 'os', name: 'OS 홈', desc: '8개 서비스 한 곳에서', icon: { char: '⌂' }, href: `${OS_BASE}/` },
  { key: 'planner', name: '플래너', desc: '내 공부, 내가 설계한다.', icon: { img: '/os/icons/03_planner.svg' }, href: '/planner', current: true },
  { key: 'classbot', name: '클래스봇', desc: '선생님의 분신을 만든다.', icon: { img: '/os/icons/04_classbot.svg' }, href: `${OS_BASE}/classbot`, soon: true },
  { key: 'q', name: '문제 Q', desc: '풀고, 틀리고, 다시 자라난다.', icon: { img: '/os/icons/05_q.svg' }, href: `${OS_BASE}/q`, soon: true },
  { key: 'games', name: '게임즈', desc: '숙제 끝나고 30분 더 한다.', icon: { img: '/os/icons/06_games.svg' }, href: `${OS_BASE}/games` },
  { key: 'store', name: '스토어', desc: '검증된 콘텐츠만 사고 판다.', icon: { img: '/os/icons/02_store.svg' }, href: `${OS_BASE}/store`, soon: true },
  { key: 'reader', name: '리더', desc: '내 자료 가져와 필기하는 학습 노트앱.', icon: { img: '/os/icons/10_reader.svg' }, href: `${OS_BASE}/reader`, soon: true },
  { key: 'studio', name: '스튜디오', desc: '제작은 AI가, 검증은 사람이.', icon: { img: '/os/icons/01_studio.svg' }, href: `${OS_BASE}/studio`, soon: true },
];

/** 현재 서비스(플래너) */
export const CURRENT_SERVICE = PULLIM_SERVICES.find((s) => s.current)!;
