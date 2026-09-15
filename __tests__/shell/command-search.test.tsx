/**
 * 헤더 검색(⌘K 메뉴 팔레트) — 풀림 Q(dev-q) 헤더 정합 회귀 방지.
 *
 * 고치기 전의 플래너 헤더는 검색 버튼에 핸들러가 없고 ⌘K 리스너도 없어서, 툴팁만
 * "검색 (⌘ K)" 라고 말하는 장식 버튼이었다. 여기서 지키는 것은 그 회귀 방지다:
 *   - 버튼 클릭과 ⌘K/Ctrl+K 가 **같은** 팔레트를 연다
 *   - 입력 중(IME 포함)에는 단축키가 타이핑을 가로채지 않는다
 *   - 결과에서 Enter 가 실제로 라우팅한다
 */
import '@testing-library/jest-dom';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/planner',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { name: '홍길동', grade: '고2' },
    logout: jest.fn(),
    planLabel: '기본',
  }),
}));

// 스위처·OS 링크는 이 카드의 관심사가 아니다(별 컴포넌트·env 의존).
jest.mock('@/components/shell/service-switcher', () => ({ ServiceSwitcher: () => null }));
jest.mock('@/components/shell/pullim-services', () => ({ osHomeUrl: () => '' }));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppHeader } from '@/components/shell/app-header';
import { navSearchItems } from '@/components/shell/nav-config';

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

// DialogTitle 도 sr-only 로 '메뉴 검색' 이라 라벨 텍스트만으로는 다이얼로그와 입력이 함께 잡힌다.
// 입력 자체를 가리키도록 role 로 좁힌다.
const findInput = () => screen.findByRole('textbox', { name: '메뉴 검색' });
const queryInput = () => screen.queryByRole('textbox', { name: '메뉴 검색' });

describe('AppHeader 검색 (풀림 Q 정합)', () => {
  beforeEach(() => mockPush.mockClear());

  it('검색 버튼 클릭이 팔레트를 연다 — 눌러도 아무 일 없던 장식 버튼이 아니다', async () => {
    render(<AppHeader />);
    expect(queryInput()).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('검색'));

    expect(await findInput()).toBeInTheDocument();
  });

  it('열리면 입력에 포커스가 간다 — 열자마자 타이핑할 수 있어야 한다', async () => {
    // 지금은 입력이 팔레트의 첫 tabbable 이라 base-ui 기본값으로도 잡히지만, 앞에 tabbable 이
    // 하나 생기면 조용히 옮겨간다. DialogContent 의 initialFocus 지정을 여기서 고정한다.
    render(<AppHeader />);
    fireEvent.click(screen.getByLabelText('검색'));

    const input = await findInput();
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('⌘K / Ctrl+K 가 같은 팔레트를 연다', async () => {
    const { unmount } = render(<AppHeader />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(await findInput()).toBeInTheDocument();
    unmount();

    render(<AppHeader />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(await findInput()).toBeInTheDocument();
  });

  it('입력 요소에 포커스가 있으면 단축키가 타이핑을 가로채지 않는다', () => {
    render(
      <>
        <AppHeader />
        <input aria-label="본문 입력" />
      </>,
    );
    const field = screen.getByLabelText('본문 입력');
    field.focus();

    fireEvent.keyDown(field, { key: 'k', metaKey: true });

    expect(queryInput()).not.toBeInTheDocument();
  });

  it('IME 조합 중(isComposing)에는 열지 않는다 — 한글 입력을 깨지 않도록', () => {
    render(<AppHeader />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true, isComposing: true });

    expect(queryInput()).not.toBeInTheDocument();
  });

  it('검색 결과에서 Enter 가 해당 메뉴로 이동한다', async () => {
    render(<AppHeader />);
    fireEvent.click(screen.getByLabelText('검색'));
    const input = await findInput();

    // 인덱스 첫 항목(현재 IA 의 '홈')을 라벨로 좁혀 Enter — 항목 순서가 바뀌어도 라벨로 찾는다.
    const target = navSearchItems[0];
    fireEvent.change(input, { target: { value: target.label } });
    await screen.findByText(target.label);
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockPush).toHaveBeenCalledWith(target.href);
    // 이동하면 팔레트는 닫힌다.
    await waitFor(() => expect(queryInput()).not.toBeInTheDocument());
  });

  it('일치하는 메뉴가 없으면 빈 결과 안내를 낸다', async () => {
    render(<AppHeader />);
    fireEvent.click(screen.getByLabelText('검색'));
    const input = await findInput();

    fireEvent.change(input, { target: { value: 'zzzzzz없는메뉴' } });

    expect(await screen.findByText('일치하는 메뉴가 없어요.')).toBeInTheDocument();
  });
});

describe('검색 인덱스 (navSearchItems)', () => {
  it('출시 전 잠금 항목을 담지 않는다 — 검색이 게이트를 우회하지 않도록', () => {
    expect(navSearchItems.length).toBeGreaterThan(0);
    for (const item of navSearchItems) {
      expect(item.href).toMatch(/^\/planner/);
      expect(item.label).toBeTruthy();
    }
  });

  it('href 가 중복되지 않는다', () => {
    const hrefs = navSearchItems.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
