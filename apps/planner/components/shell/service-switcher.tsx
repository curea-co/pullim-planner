'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
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
        {PULLIM_SERVICES.map((s) =>
          // 준비 중 서비스는 진입 차단(레포 정책) — 링크가 아닌 비활성 항목으로 렌더.
          s.soon ? (
            <div
              key={s.key}
              role="menuitem"
              aria-disabled
              className="sm-item is-soon"
            >
              <ServiceItemBody service={s} />
            </div>
          ) : (
            <a
              key={s.key}
              href={s.href}
              role="menuitem"
              className={`sm-item${s.current ? ' is-current' : ''}`}
              aria-current={s.current ? 'page' : undefined}
            >
              <ServiceItemBody service={s} />
            </a>
          ),
        )}
      </div>
    </div>
  );
}
