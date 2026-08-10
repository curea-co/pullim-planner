/**
 * 헤더 프로필 드롭다운 — 풀림 OS(pullim-web `OsTopbar`) 정합 회귀 방지 (QA(OS) #91).
 *
 * OS 사용자 메뉴의 확정 모양(참조: pullim-web `src/components/os/OsTopbar.tsx` §Avatar + user menu):
 *   - 신원 행: 이름(좌) + 등급 배지(우 가장자리) — `justify-content: space-between`
 *   - 링크·로그아웃 모두 **텍스트만**(아이콘 글리프 없음)
 *   - 로그아웃은 본문 잉크색(`var(--ink-2)`) — 위험(빨강) 강조가 아니다
 * 셋 중 하나라도 어긋나면 같은 계정이 OS 와 플래너에서 다른 메뉴로 보인다.
 */
import '@testing-library/jest-dom';

const mockLogout = jest.fn().mockResolvedValue(undefined);
let mockPlanLabel = '기본';

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { name: '홍길동', grade: '고2' },
    logout: mockLogout,
    planLabel: mockPlanLabel,
  }),
}));

// 서비스 스위처는 이 카드의 관심사가 아니다(별 컴포넌트·env 의존) — 프로필 메뉴만 남긴다.
jest.mock('@/components/shell/service-switcher', () => ({
  ServiceSwitcher: () => null,
}));

// OS 설정 링크는 티어 안전장치(env 미설정이면 미노출)라 테스트에선 설정된 티어를 고정한다.
jest.mock('@/components/shell/pullim-services', () => ({
  osHomeUrl: () => 'https://os.pullim.ai',
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { AppHeader } from '@/components/shell/app-header';

/** base-ui Positioner(floating-ui)가 jsdom 에 없는 ResizeObserver 를 요구한다. */
beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

async function openProfileMenu() {
  render(<AppHeader />);
  fireEvent.click(screen.getByLabelText('사용자'));
  return screen.findByRole('menuitem', { name: '로그아웃' });
}

describe('AppHeader 프로필 드롭다운 (OS 정합 — QA(OS) #91)', () => {
  beforeEach(() => {
    mockPlanLabel = '기본';
    mockLogout.mockClear();
  });

  it("'기본' 배지가 사용자 이름 영역의 오른쪽 가장자리에 온다", async () => {
    await openProfileMenu();

    const badge = screen.getByText('기본');
    const row = badge.parentElement!;
    // 같은 행(이름 ↔ 배지)이고, 배지가 그 행의 마지막(= 오른쪽 가장자리) 요소여야 한다.
    expect(row).toHaveTextContent('홍길동');
    expect(row.lastElementChild).toBe(badge);
    expect(row.className).toContain('justify-between');
  });

  it('조회 전·실패(빈 라벨)면 배지를 그리지 않는다 — 유료 회원에게 기본을 위장하지 않는다', async () => {
    mockPlanLabel = '';
    await openProfileMenu();

    expect(screen.queryByText('기본')).not.toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
  });

  it('메뉴 항목에 아이콘(svg)을 달지 않는다 — OS 는 텍스트만', async () => {
    await openProfileMenu();

    for (const item of screen.getAllByRole('menuitem')) {
      expect(item.querySelector('svg')).toBeNull();
    }
  });

  it('로그아웃은 destructive(빨강)가 아니라 본문색(default) 이다', async () => {
    const logout = await openProfileMenu();

    // 색은 data-variant 로 갈린다(dropdown-menu.tsx: `data-[variant=destructive]:text-destructive`).
    // 조건부 variant 클래스는 default 에서 발동하지 않으므로, 무조건 적용되는 색 클래스만 본다.
    expect(logout).toHaveAttribute('data-variant', 'default');
    const unconditional = logout.className.split(/\s+/).filter((c) => !c.includes(':'));
    expect(unconditional).not.toContain('text-destructive');
    expect(unconditional.some((c) => /^text-(destructive|red)/.test(c))).toBe(false);
  });

  it('메뉴 구성은 OS 와 같은 설정·로그아웃 2개다', async () => {
    await openProfileMenu();

    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['설정', '로그아웃']);
  });

  it('로그아웃 클릭이 세션 로그아웃을 호출한다', async () => {
    const logout = await openProfileMenu();

    fireEvent.click(logout);
    expect(mockLogout).toHaveBeenCalled();
  });
});
