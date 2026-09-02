import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 레일(사이드바) 하단 고정 문의 카드 — OS 정본(pullim-web #140·#141 `RailFooter`) 미러.
 * 사용자가 어느 화면에서든 문의 경로를 찾을 수 있게 `support@curea.co` mailto 를 상시 노출한다.
 * AppSidebar 의 펼침·compact·collapsed 전 모드가 공유 — 카드 UI 를 한 곳에서 관리(중복 방지).
 * 바닥 고정은 루트의 `mt-auto`(정본 `.rail-foot { margin-top: auto }` 대응 — nav 가 flex-col).
 *
 * 정본은 OS raw 토큰(--paper-2·--line·--pullim-blue·--sh-1)을 쓰지만 플래너 사이드바는
 * PUDS Tailwind 세계라 대응 토큰으로 옮겼다(연면 bg-pullim-slate-50 ↔ --paper-2 ·
 * border-border ↔ --line · hover 강조 pullim-blue ↔ --pullim-blue · shadow-pullim-sm ↔ --sh-1).
 */
const CONTACT_EMAIL = 'support@curea.co';

export function RailFooter({ iconOnly }: { iconOnly?: boolean }) {
  if (iconOnly) {
    // compact(md)·collapsed(lg 접힘) — 아이콘 전용 mailto 버튼(NavRow iconOnly 규격 42px 정합)
    return (
      <div className="mt-auto w-full pt-4">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          aria-label={`문의하기 — ${CONTACT_EMAIL}`}
          title={`문의하기 — ${CONTACT_EMAIL}`}
          className={cn(
            'mx-auto flex h-[42px] w-[42px] items-center justify-center rounded-[11px] border border-border bg-pullim-slate-50',
            'text-pullim-slate-500 transition-colors hover:border-pullim-blue-200 hover:bg-card hover:text-pullim-blue-600',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
          )}
        >
          <Mail className="h-4 w-4" aria-hidden />
        </a>
      </div>
    );
  }

  return (
    <div className="mt-auto pt-4">
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className={cn(
          'block rounded-xl border border-border bg-pullim-slate-50 px-3 py-2.5 transition-all',
          'hover:border-pullim-blue-200 hover:bg-card hover:shadow-pullim-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
          'group',
        )}
      >
        <span className="text-pullim-slate-500 flex items-center gap-1.5 text-[length:var(--text-xs)] font-semibold">
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
          문의하기
        </span>
        <span className="text-pullim-slate-900 group-hover:text-pullim-blue-600 mt-1 block text-[length:var(--text-sm)] font-semibold tracking-tight break-all transition-colors">
          {CONTACT_EMAIL}
        </span>
      </a>
    </div>
  );
}
