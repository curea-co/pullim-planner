/**
 * 헤더 알림 벨 — 풀림 Q(dev-q) 헤더 정합 회귀 방지.
 *
 * 고치기 전의 벨은 `<Link href="/planner/notifications">` 라, 알림이 0건인데도 보던 화면을
 * 떠나 전체 페이지를 전환했다. Q 는 제자리에서 드롭다운 패널을 연다. 여기서 지키는 것은:
 *   - 벨이 링크가 아니라 패널 트리거다(라우팅하지 않는다)
 *   - 0건이면 패널 안에서 빈 상태를 안내한다
 *   - 미읽음이 없을 때 점 배지를 찍지 않는다
 *   - 패널이 `role="menu"` 가 아니다 — 안에 menuitem 이 없는 메뉴를 만들지 않는다(Codex #270)
 */
import '@testing-library/jest-dom';

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { name: '홍길동', grade: '고2' },
    logout: jest.fn(),
    planLabel: '기본',
  }),
}));

jest.mock('@/components/shell/service-switcher', () => ({ ServiceSwitcher: () => null }));
jest.mock('@/components/shell/pullim-services', () => ({ osHomeUrl: () => '' }));

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

describe('AppHeader 알림 벨 (풀림 Q 정합)', () => {
  it('링크가 아니라 패널 트리거다 — 누르면 화면을 떠나지 않는다', () => {
    render(<AppHeader />);

    const bell = screen.getByLabelText('알림');
    expect(bell.tagName).toBe('BUTTON');
    expect(bell).not.toHaveAttribute('href');
    expect(bell.closest('a')).toBeNull();
  });

  it('벨을 누르면 제자리에서 알림 패널이 열린다', async () => {
    render(<AppHeader />);

    fireEvent.click(screen.getByLabelText('알림'));

    expect(await screen.findByRole('heading', { name: '알림' })).toBeInTheDocument();
    expect(screen.getByText('받은 알림이 없어요')).toBeInTheDocument();
    expect(screen.getByText('중요한 소식이 생기면 여기로 알려드릴게요.')).toBeInTheDocument();
  });

  it('패널은 menu 가 아니라 이름 있는 dialog 다 (Codex #270)', async () => {
    // DropdownMenuContent(base-ui Menu.Popup)는 컨테이너에 role="menu" 를 붙인다. 알림 피드의
    // 내용물은 메뉴 항목이 아니라 읽을 거리라, 그 안엔 menuitem 이 하나도 생기지 않는다 —
    // 스크린리더엔 "항목 없는 메뉴". Popover(role=dialog)로 바꾸고 제목으로 이름을 준다.
    render(<AppHeader />);
    fireEvent.click(screen.getByLabelText('알림'));

    const panel = await screen.findByRole('dialog', { name: '알림' });
    expect(panel).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('미읽음이 없으면 점 배지를 찍지 않는다 — 항상 켜진 배지는 오해를 만든다', () => {
    render(<AppHeader />);

    const bell = screen.getByLabelText('알림');
    expect(bell.querySelector('.dot')).toBeNull();
    // 미읽음이 생기면 라벨이 '알림 N건' 으로 바뀐다(현재는 0건이라 '알림').
    expect(bell).toHaveAttribute('aria-label', '알림');
  });
});
