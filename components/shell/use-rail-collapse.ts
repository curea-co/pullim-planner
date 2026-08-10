'use client';

import { useEffect, useState } from 'react';

/** 형제 앱(Q·입시·라이팅 코치) 공통 키 — 접기 상태를 서비스 간 일관되게 영속 */
export const RAIL_KEY = 'puds-rail-collapsed';

/**
 * lg+ 사이드바 접기 토글 상태. SSR 안전을 위해 초기값 false,
 * 마운트 후 localStorage에서 복원(형제 앱 공통 패턴).
 */
export function useRailCollapse() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(RAIL_KEY) === '1') setCollapsed(true);
    } catch {
      /* private mode 등 storage 접근 실패 무시 */
    }
  }, []);

  const toggle = () =>
    setCollapsed(c => {
      const next = !c;
      try {
        localStorage.setItem(RAIL_KEY, next ? '1' : '0');
      } catch {
        /* 무시 */
      }
      return next;
    });

  return { collapsed, toggle };
}
