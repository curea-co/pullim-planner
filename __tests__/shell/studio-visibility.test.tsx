import { render, screen } from '@testing-library/react';
import { ServiceSwitcher } from '@/components/shell/service-switcher';

describe('서비스 스위처 출시 목록', () => {
  it('입시 코치·클래스봇·스튜디오를 항상 표시한다', () => {
    render(<ServiceSwitcher />);
    expect(screen.getByText('입시 코치')).toBeInTheDocument();
    expect(screen.getByText('클래스봇')).toBeInTheDocument();
    expect(screen.getByText('스튜디오')).toBeInTheDocument();
  });
});
