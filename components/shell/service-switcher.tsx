'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import {
  PULLIM_SERVICES,
  CURRENT_SERVICE,
  type PullimService,
} from './pullim-services';

/** 서비스 글리프(아이콘 img 또는 단일 문자) */
function Glyph({ service }: { service: PullimService }) {
  if ('img' in service.icon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={service.icon.img} alt="" aria-hidden />;
  }
  // 문자형 글리프 — 스타일은 os-topbar.css `.sg-char`(인라인 style 금지: CLAUDE.md)
  return <span className="sg-char">{service.icon.char}</span>;
}

/** 서비스 메뉴 항목 내부(글리프 + 이름/설명 + 준비중 배지) */
function ServiceItemBody({ service }: { service: PullimService }) {
  return (
    <>
      <span className="sg">
        <Glyph service={service} />
      </span>
      <div>
        <div className="sm-name">{service.name}</div>
        <div className="sm-desc">{service.desc}</div>
      </div>
      {service.soon && <span className="badge soft sm-meta">준비 중</span>}
    </>
  );
}

/**
 * OS 공통 헤더 '서비스 전환' 스위처 — pullim-web OS 헤더 구조/스타일 차용(`os-topbar.css`).
 * 현재 서비스(플래너)를 트리거에 표시, 메뉴에서 다른 풀림 서비스로 이동.
 */
export function ServiceSwitcher() {
  // `accountEmail` 은 중앙 계정(`GET /me`)에서 오고 planner 권한·프로필과 무관하다.
  // `status === 'authenticated'` 를 함께 요구하지 않는 이유: 그러면 planner 엔타이틀먼트가 없는
  // (403) 또는 온보딩 전(404) curea 계정에서 스튜디오가 영구히 숨는다 — 정작 스튜디오만 쓰는
  // 사람이 못 본다. 값이 있다는 것 자체가 **중앙 세션이 유효하다**는 뜻이다(Codex #257).
  const { accountEmail } = useAuth();
  const showStudio = /^[^@\s]+@curea\.co$/i.test(accountEmail ?? '');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭/Esc 로 닫기
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`switcher${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className="switcher-trigger"
        aria-label="서비스 전환"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sg">
          <Glyph service={CURRENT_SERVICE} />
        </span>
        <span className="sn">{CURRENT_SERVICE.name}</span>
        <ChevronDown className="chev" width={16} height={16} aria-hidden />
      </button>

      <div className="switcher-menu" role="menu">
        <div className="sm-head">서비스 전환</div>
        {PULLIM_SERVICES.map((s) => {
          if (s.key === 'studio' && !showStudio) return null;
          // 준비 중 서비스는 진입 차단(레포 정책) — 링크가 아닌 비활성 항목으로 렌더.
          if (s.soon) {
            return (
              <div key={s.key} role="menuitem" aria-disabled className="sm-item is-soon">
                <ServiceItemBody service={s} />
              </div>
            );
          }
          // 현재 서비스(플래너)도 링크가 아니다 — 지금 보고 있는 화면으로 다시 보내는 링크라
          // 누르면 편집 중이던 화면 상태만 잃는다. '현재 위치'만 표시한다(정본 Q 와 동일).
          if (s.current) {
            return (
              <div
                key={s.key}
                role="menuitem"
                aria-current="page"
                className="sm-item is-current"
              >
                <ServiceItemBody service={s} />
              </div>
            );
          }
          return (
            <a key={s.key} href={s.href} role="menuitem" className="sm-item">
              <ServiceItemBody service={s} />
            </a>
          );
        })}
      </div>
    </div>
  );
}
