'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, LogOut, Settings, BookOpen, Mail } from 'lucide-react';
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
export function AppHeader() {
  return (
    <header className="os-root topbar">
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
  const { user, logout } = useAuth();

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
          <DropdownMenuLabel className="px-2 py-1.5">
            <div className="text-pullim-slate-900 text-sm font-bold">{name}</div>
            <div className="text-pullim-slate-500 text-[11px] font-normal">{sub}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {/* '서비스 소개' → OS '설정'으로 교체(사용자 확정 2026-07-13) — 온보딩 진입은 LNB '매뉴얼' 유지.
              OS 설정은 외부 앱(os.pullim.ai)이라 하드 내비게이션(쿠키 Domain=.pullim.ai 자동 동반).
              URL 은 티어 안전장치(osHomeUrl — env 미설정이면 항목 미노출) 재사용. */}
          {osHomeUrl() && (
            <DropdownMenuItem
              onClick={() => { window.location.href = `${osHomeUrl()}/os/settings`; }}
              className="gap-1.5 px-2 py-1.5 text-sm"
            >
              <Settings className="h-4 w-4" />
              설정
            </DropdownMenuItem>
          )}
          {/* 매뉴얼(온보딩) — 모바일(md 미만)은 LNB 가 없어 이 항목이 유일한 진입 경로(Codex #154).
              LNB '매뉴얼'과 동일 명칭·목적지. */}
          <DropdownMenuItem
            onClick={() => router.push('/planner/onboarding')}
            className="gap-1.5 px-2 py-1.5 text-sm"
          >
            <BookOpen className="h-4 w-4" />
            매뉴얼
          </DropdownMenuItem>
          {/* 문의하기 — 모바일(md 미만)은 레일(RailFooter)이 없어 프로필 메뉴가 문의 진입점(Codex #157).
              데스크톱은 레일 카드와 중복 노출이지만 무해(같은 mailto). */}
          <DropdownMenuItem
            onClick={() => { window.location.href = 'mailto:support@curea.co'; }}
            className="gap-1.5 px-2 py-1.5 text-sm"
          >
            <Mail className="h-4 w-4" />
            문의하기
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={handleLogout}
            variant="destructive"
            className="gap-1.5 px-2 py-1.5 text-sm"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
