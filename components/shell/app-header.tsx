'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { ServiceSwitcher } from './service-switcher';
import { osHomeUrl } from './pullim-services';

/**
 * 상단 헤더 — **풀림 OS 공통 헤더(topbar)** 를 플래너에 적용(vendoring: `app/os-topbar.css`).
 * pullim-web `os.pullim.local:3001` 헤더 구조: mast(로고) · 서비스 전환 스위처 · 검색 · 알림 · 사용자.
 * 스타일은 `.os-root` 스코프 CSS(플래너 PUDS 테마와 분리).
 */
type AppHeaderProps = {
  /** 레일 접힘 상태 — 미주입이면 토글을 렌더하지 않는다(셸 밖에서 쓰는 경우). */
  railCollapsed?: boolean;
  onToggleRail?: () => void;
};

export function AppHeader({ railCollapsed, onToggleRail }: AppHeaderProps = {}) {
  return (
    <header className="os-root topbar">
      {/* 레일 접기 — 정본은 topbar 의 첫 자식이다(os `OsShell.tsx`: RailCollapseToggle → mast).
          아이콘도 정본과 같은 패널 글리프. 920px 이하는 CSS 가 감춘다. */}
      {onToggleRail && (
        <button
          type="button"
          className="rail-collapse-btn"
          aria-pressed={railCollapsed}
          aria-label={railCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          title={railCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          onClick={onToggleRail}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
        </button>
      )}
      {/* 모바일 햄버거 drawer 제거(2026-07-10) — OS 정합: OS는 md 미만에서 하단 탭바만 쓰고
          햄버거를 두지 않는다. 플래너도 동일하게 탭바(+프로필 메뉴)로 일원화. */}
      <Link href="/" className="mast" aria-label="풀림 플래너 홈">
        <span className="glyph">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/os/icons/pullim.svg" alt="" aria-hidden />
        </span>
        <span className="wordmark">풀림</span>
        <span className="sub">플래너</span>
      </Link>

      <ServiceSwitcher />

      <div className="spacer" />

      <div className="tb-actions">
        <button type="button" className="icon-btn" aria-label="검색" title="검색 (⌘ K)">
          <Search width={20} height={20} aria-hidden />
        </button>
        {/* 항상 켜져 있던 unread 점 배지 제거 — 알림 발송 인프라 미구현(soft-open)이라 실제 unread 없음.
            "안 읽은 알림 있음" 오해 방지. 실 알림 파이프라인 준비 시 unread 여부와 연동해 복원. */}
        <Link href="/planner/notifications" className="icon-btn" aria-label="알림">
          <Bell width={20} height={20} aria-hidden />
        </Link>
        <AuthCluster />
      </div>
    </header>
  );
}

/** 사용자 — 아바타(프로필 메뉴). 헤더는 RequireAuth 안에서만 렌더된다. */
function AuthCluster() {
  // 헤더(셸)는 RequireAuth 가 authenticated/onboarding 일 때만 렌더한다. unauthenticated/error/loading 은
  // RequireAuth 가 중앙 로그인 리다이렉트/안내로 처리(셸 미렌더)이므로 여기 도달하지 않는다.
  // → status 로 판정(프로필이 아직 null 이어도 '로그인된' 상태: login 직후·온보딩 404 경로).
  const { status } = useAuth();
  if (status === 'authenticated' || status === 'onboarding') return <ProfileMenu />;
  return null;
}

function ProfileMenu() {
  const router = useRouter();
  const { user, logout, planLabel } = useAuth();

  // 헤더 프로필은 실 인증 사용자(pullim-api /planner/me). 본문 도메인 데이터는 아직 mock(GATED).
  const name = user?.name ?? '';
  // MeProfile 엔 email 없음(auth 소유) — 학년을 보조 표기로 사용.
  const sub = user?.grade ?? '';

  async function handleLogout() {
    try {
      await logout();
      router.replace('/login');
    } catch {
      toast.error('로그아웃에 실패했어요', {
        description: '잠시 후 다시 시도해주세요.',
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="사용자" className="avatar">
        {name ? name[0] : '?'}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          {/* 신원 — OS 헤더(pullim-web OsTopbar) 정합: 이름 + 플랜 배지 / 보조행(QA #91).
              이름 오른쪽 슬롯은 OS 와 같이 **플랜 배지**('기본'·'유료')가 갖는다. 배지는 서버
              엔타이틀먼트 파생이라 조회 전·실패면 렌더하지 않는다(빈 라벨) — 유료 회원에게
              '기본' 을 단정하지 않기 위해. 학년(sub)은 기존대로 아래 보조행. */}
          <DropdownMenuLabel className="px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-pullim-slate-900 truncate text-sm font-bold">{name}</div>
              {planLabel && (
                <span className="bg-pullim-slate-100 text-pullim-slate-600 shrink-0 rounded-full px-2 py-0.5 text-[length:var(--text-xs)] font-semibold">
                  {planLabel}
                </span>
              )}
            </div>
            <div className="text-pullim-slate-500 text-[length:var(--text-xs)] font-normal">{sub}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {/* 프로필 메뉴 구성 = OS 기준(사용자 이름 · 설정 · 로그아웃) 정합 — 사용자 확정 2026-07-13.
              '매뉴얼'·'문의하기'는 제거: 온보딩은 최초 1회로 충분하고, 문의는 레일 카드(RailFooter)로
              충분하다는 제품 결정. md 미만에서 온보딩·문의 진입점이 없어지는 것은 **수용된 트레이드오프**
              (Codex #154·#157 지적을 오너가 명시적으로 검토 후 반려).
              **메뉴 항목 아이콘 없음** — OS 사용자 메뉴는 텍스트만 쓴다(OsTopbar 링크 nav·로그아웃
              버튼 모두 글리프 없음). 플래너만 lucide 아이콘을 달면 같은 메뉴가 서로 달라 보인다(QA(OS) #91).
              OS 설정은 외부 앱이라 하드 내비게이션(쿠키 Domain=.pullim.ai 자동 동반).
              URL 은 티어 안전장치(osHomeUrl — env 미설정이면 항목 미노출) 재사용. */}
          {osHomeUrl() && (
            <DropdownMenuItem
              onClick={() => { window.location.href = `${osHomeUrl()}/os/settings`; }}
              className="px-2 py-1.5 text-sm"
            >
              설정
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {/* 로그아웃 — OS(pullim-web OsTopbar)는 본문 잉크색 버튼이다(`color: var(--ink-2)`).
              destructive(빨강)는 OS 에 없는 위험 강조라 QA(OS) #91 에서 '검은색' 으로 정정.
              variant 를 default 로 두면 팝오버 본문색(text-popover-foreground)을 그대로 상속한다. */}
          <DropdownMenuItem onClick={handleLogout} className="px-2 py-1.5 text-sm">
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
