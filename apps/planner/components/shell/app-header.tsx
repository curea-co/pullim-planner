'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, Flame, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { PullimLogo } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { currentPersona, getDday, getActivePlanner } from '@/lib/mock';
import { composeDDayChipProps } from '@/lib/planner/d-day-tier';
import { DDayChip } from '@/components/shared/d-day-chip';
import { type Role } from './nav-config';
import { MobileDrawer } from './mobile-drawer';

/**
 * 상단 헤더 — 플래너 전용 단순화 (student 단일 역할).
 */
export function AppHeader({ role }: { role: Role }) {
  // 가장 가까운 시험 D-day — 어디 페이지에 있든 헤더에 상시 가시 (§ 2.3)
  const dday = getDday(currentPersona);
  const examName = getActivePlanner().name;

  return (
    <header className="bg-card/85 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        <MobileDrawer role={role} />

        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <PullimLogo size={22} />
          <span className="text-pullim-slate-500 hidden text-[10px] font-bold uppercase md:inline">
            플래너
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          {/* D-day 상시 칩 — Tier별 색 자동 매핑 (§ 2.3) */}
          <Link
            href="/planner"
            aria-label={`${examName} D-day로 이동`}
            className="hidden rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 sm:inline-flex"
            title={`${examName}까지 D-${dday > 0 ? dday : 0}`}
          >
            <DDayChip {...composeDDayChipProps(dday, examName)} />
          </Link>
          <Badge
            variant="secondary"
            className="bg-pullim-blue-50 text-pullim-blue-700 border-pullim-blue-100 hidden gap-1 sm:inline-flex"
          >
            <Flame className="h-3.5 w-3.5" />
            {currentPersona.streakDays}일째
          </Badge>
          <button
            aria-label="검색"
            className="hover:bg-pullim-slate-100 relative inline-flex h-9 w-9 items-center justify-center rounded-lg"
            title="검색 (⌘ K)"
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            href="/planner/notifications"
            aria-label="알림"
            className="hover:bg-pullim-slate-100 relative inline-flex h-9 w-9 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
          >
            <Bell className="h-5 w-5" />
            <span className="bg-pullim-danger absolute top-1.5 right-1.5 inline-block h-2 w-2 rounded-full" />
          </Link>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
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
      <DropdownMenuTrigger
        aria-label="프로필 메뉴 열기"
        className="bg-pullim-blue-600 hover:bg-pullim-blue-700 hover:ring-pullim-blue-200 ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white transition-all hover:ring-2 focus-visible:ring-pullim-blue-300 focus-visible:ring-2 outline-none"
      >
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
