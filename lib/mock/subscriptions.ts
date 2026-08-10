/**
 * 도메인 사용권(entitlement) — 풀림 플랫폼 안에서 각 도메인은 *독립 결제*로 사용권 획득.
 * 데모 단계는 Q만 다루고, 향후 라이브러리/클래스봇/스튜디오 등으로 확장.
 *
 * default: Q 미구독. 플래너 사용자가 Q 풀이로 진입하려면 Q 구독이 필요.
 * 데모 한계: module singleton. SSR 새 진입 시 reset.
 *
 * ⚠️ Q 연계 자체가 미개통이라 `Q_LINK_ENABLED`(default off) 게이트가 최우선 —
 * off면 구독 상태와 무관하게 `hasQAccess()`는 false다(soft-open, 2026-07-10).
 */

import { Q_LINK_ENABLED } from '@/lib/flags';

export type DomainSubscriptions = {
  q: { active: boolean };
};

const domainSubscriptions: DomainSubscriptions = {
  q: { active: false },
};

export function hasQAccess(): boolean {
  // Q 연계 미개통(Q_LINK_ENABLED off)이면 구독 여부와 무관하게 항상 false —
  // "연계 서비스 준비 중" 안내(문구)와 동작을 일치시키고, 데모 훅(setQAccess)도 함께 막는다.
  if (!Q_LINK_ENABLED) return false;
  return domainSubscriptions.q.active;
}

export function setQAccess(active: boolean): void {
  domainSubscriptions.q.active = active;
}

if (typeof window !== 'undefined') {
  // 데모 시연용 — 콘솔에서 `window.__pullim.setQAccess(true)`로 즉시 전환 후 새로고침.
  (window as unknown as { __pullim?: Record<string, unknown> }).__pullim = {
    ...((window as unknown as { __pullim?: Record<string, unknown> }).__pullim ?? {}),
    setQAccess,
    hasQAccess,
  };
}
