/**
 * 현재 서비스(플래너)는 **링크가 아니다** (정본 Q `service-menu-list.tsx:60-72` 와 동일).
 *
 * 종전에는 자기 자신도 `<a href="/planner">` 였다. 지금 보고 있는 화면으로 다시 보내는 링크라
 * 누르면 편집 중이던 화면 상태만 잃는다. '현재 위치'만 표시한다.
 */
import { render, screen } from '@testing-library/react';
import { ServiceSwitcher } from '@/components/shell/service-switcher';
import { PULLIM_SERVICES } from '@/components/shell/pullim-services';

describe('서비스 스위처 — 현재 서비스', () => {
  it('현재 서비스는 링크가 아니고 aria-current="page" 를 갖는다', () => {
    render(<ServiceSwitcher />);

    const current = document.querySelector('[aria-current="page"]')!;
    expect(current).toBeInTheDocument();
    expect(current.tagName).not.toBe('A');
    expect(current).not.toHaveAttribute('href');
    expect(current).toHaveTextContent('플래너');
  });

  it('현재 서비스 항목이 딱 하나다', () => {
    render(<ServiceSwitcher />);
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('메뉴 항목 수는 카탈로그와 같다 — 현재 서비스를 비링크로 바꾸며 빠뜨리지 않게', () => {
    render(<ServiceSwitcher />);
    expect(screen.getAllByRole('menuitem')).toHaveLength(PULLIM_SERVICES.length);
  });

  it('비활성(준비 중) 항목은 링크가 아니다 — 기존 정책 회귀 방지', () => {
    render(<ServiceSwitcher />);
    for (const el of document.querySelectorAll('[aria-disabled]')) {
      expect(el.tagName).not.toBe('A');
    }
  });
});
