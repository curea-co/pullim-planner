/**
 * 사이드바 플랫 PUDS 레일 — 형제 앱(Q·코치) 공통 패턴 회귀 방지.
 */
import '@testing-library/jest-dom';

let mockPathname = '/planner/manage/abc/edit';
let mockSearch = '';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

import { render, screen } from '@testing-library/react';
import { AppSidebar } from '@/components/shell/app-sidebar';

describe('AppSidebar (플랫 PUDS 레일)', () => {
  beforeEach(() => {
    mockPathname = '/planner/manage/abc/edit';
    mockSearch = '';
  });

  it('mono 눈썹 라벨과 핵심 항목을 플랫하게 렌더한다', () => {
    render(<AppSidebar />);
    expect(screen.getByText('풀림 플래너')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '홈' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '시간표 관리' })).toBeInTheDocument();
    // 공유(공스타그램)는 STUDYGRAM_ENABLED 게이트로 기본 미노출 (QA #20 — 계정 연동 미비)
    expect(screen.queryByRole('link', { name: '공유' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '매뉴얼' })).toBeInTheDocument();
  });

  it('최장 prefix 매치 항목에만 aria-current를 단다', () => {
    render(<AppSidebar />);
    // pathname=/planner/manage/abc/edit → '/planner'와 '/planner/manage' 둘 다 prefix지만 긴 쪽이 활성
    expect(screen.getByRole('link', { name: '시간표 관리' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '홈' })).not.toHaveAttribute('aria-current');
  });

  it('매뉴얼(/planner/onboarding)은 온보딩 경로에서 활성 — 홈을 이긴다', () => {
    mockPathname = '/planner/onboarding';
    render(<AppSidebar />);
    expect(screen.getByRole('link', { name: '매뉴얼' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '홈' })).not.toHaveAttribute('aria-current');
  });

  it('홈에선 매뉴얼이 활성화되지 않는다', () => {
    mockPathname = '/planner';
    render(<AppSidebar />);
    expect(screen.getByRole('link', { name: '홈' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '매뉴얼' })).not.toHaveAttribute('aria-current');
  });

  it('레일 하단에 문의 카드(mailto)를 상시 노출한다', () => {
    render(<AppSidebar />);
    const contact = screen.getByRole('link', { name: /문의하기/ });
    expect(contact).toHaveAttribute('href', 'mailto:support@curea.co');
    expect(screen.getByText('support@curea.co')).toBeInTheDocument();
  });

  it('아이콘 전용(compact) 모드에서도 문의 mailto 진입점이 유지된다', () => {
    render(<AppSidebar compact />);
    const contact = screen.getByRole('link', { name: /문의하기/ });
    expect(contact).toHaveAttribute('href', 'mailto:support@curea.co');
  });

  it('compact(아이콘 전용)에선 눈썹·라벨을 숨기고 title 접근명으로 대체한다', () => {
    render(<AppSidebar compact />);
    expect(screen.queryByText('풀림 플래너')).not.toBeInTheDocument();
    // 라벨 텍스트 노드는 없지만 title 덕에 접근명은 유지
    expect(screen.getByRole('link', { name: '시간표 관리' })).toBeInTheDocument();
  });

  it('collapsed(lg 접힘)에서도 아이콘 전용으로 렌더한다', () => {
    render(<AppSidebar collapsed />);
    expect(screen.queryByText('풀림 플래너')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '홈' })).toBeInTheDocument();
  });
});
