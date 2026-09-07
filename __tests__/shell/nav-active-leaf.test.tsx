/**
 * 홈은 **잎**이다 — 하위 경로를 자기 것으로 삼지 않는다 (QA F-09).
 *
 * 종전에는 사이드바·하단탭 모두 `/planner` 를 **접두사**로 매치했다. 전용 항목이 없는
 * 하위 경로(`/planner/notifications`)에서는 홈이 유일한 매치가 되어, 알림 화면인데
 * 사이드바가 「홈」을 `aria-current="page"` 로 표시했다.
 *
 * 하단탭은 더 넓었다 — `matchPrefix: ['/', '/planner']` 의 `'/'` 는 **앱의 모든 경로**에
 * 걸린다. 가장 짧아 우선순위는 낮지만, 전용 탭이 없는 경로에서는 그게 이긴다.
 */
import { render, screen } from '@testing-library/react';

let mockPath = '/planner';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPath,
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

import { AppSidebar } from '@/components/shell/app-sidebar';
import { BottomNav } from '@/components/shell/bottom-nav';

const currentLabels = () =>
  screen.queryAllByRole('link', { current: 'page' }).map((a) => a.textContent?.trim());

describe('사이드바 — 홈은 잎이다', () => {
  it('/planner 에서는 홈이 현재 페이지다', () => {
    mockPath = '/planner';
    render(<AppSidebar />);
    expect(currentLabels()).toContain('홈');
  });

  it('/planner/notifications 에서는 홈이 현재 페이지가 아니다', () => {
    mockPath = '/planner/notifications';
    render(<AppSidebar />);
    expect(currentLabels()).not.toContain('홈');
  });

  it('전용 항목이 있는 하위 경로는 그 항목이 잡는다 — 회귀 방지', () => {
    mockPath = '/planner/manage/new';
    render(<AppSidebar />);
    expect(currentLabels()).toContain('시간표 관리');
    expect(currentLabels()).not.toContain('홈');
  });
});

describe('하단탭 — 홈은 잎이다', () => {
  const activeTab = () =>
    screen.queryAllByRole('link', { current: 'page' }).map((a) => a.textContent?.trim());

  it('/planner 에서는 홈 탭이 활성이다', () => {
    mockPath = '/planner';
    render(<BottomNav />);
    expect(activeTab()).toContain('홈');
  });

  it('/planner/notifications 에서는 어떤 탭도 활성이 아니다', () => {
    mockPath = '/planner/notifications';
    render(<BottomNav />);
    expect(activeTab()).toEqual([]);
  });

  it('/planner/manage 는 시간표 탭이 잡는다 — 회귀 방지', () => {
    mockPath = '/planner/manage';
    render(<BottomNav />);
    expect(activeTab()).toContain('시간표');
  });
});
