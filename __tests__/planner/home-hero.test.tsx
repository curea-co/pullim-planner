import { render, screen } from '@testing-library/react';
import { HomeHero } from '@/components/features/planner-home/components/home-hero';

const base = {
  examName: '수능',
  dday: 134,
  daySummary: { done: 3, total: 5 },
  weekMeta: { totalHours: 12, completedHours: 4 },
};

describe('HomeHero', () => {
  it('시험명·D-Day·오늘/주간 스탯을 노출한다', () => {
    render(<HomeHero {...base} />);
    expect(screen.getByText('수능')).toBeInTheDocument();
    expect(screen.getByText('D-134')).toBeInTheDocument();
    expect(screen.getByText(/3\/5/)).toBeInTheDocument();
    expect(screen.getByText(/12h/)).toBeInTheDocument();
  });

  it('D-0은 D-DAY로 표기한다', () => {
    render(<HomeHero {...base} dday={0} />);
    expect(screen.getByText('D-DAY')).toBeInTheDocument();
  });

  it('블록·주간 계획이 없으면 스탯 라인을 감춘다', () => {
    render(
      <HomeHero {...base} daySummary={{ done: 0, total: 0 }} weekMeta={{ totalHours: 0, completedHours: 0 }} />,
    );
    expect(screen.queryByText(/블록 완료/)).not.toBeInTheDocument();
    expect(screen.queryByText(/이번 주/)).not.toBeInTheDocument();
  });

  it('3D 장식은 aria-hidden으로 보조기기에서 숨긴다', () => {
    const { container } = render(<HomeHero {...base} />);
    expect(container.querySelector('[data-hero-3d][aria-hidden="true"]')).toBeTruthy();
  });

  // D-Day 밴드 흡수(대체) — 직전(today/critical, ~D-6) 권유 카피가 히어로 status 라인으로
  it('직전 구간(D-6 이내)엔 임박 권유 카피를 status로 노출한다', () => {
    render(<HomeHero {...base} dday={6} />);
    expect(screen.getByRole('status')).toHaveTextContent('수능까지 6일 — 컨디션 75% 이상 유지하기');
  });

  it('D-0 임박 카피는 당일 문구를 쓴다', () => {
    render(<HomeHero {...base} dday={0} />);
    expect(screen.getByRole('status')).toHaveTextContent('오늘 수능 — 컨디션 안정 우선, 새 단원 No');
  });

  it('D-7 이상(imminent~)이면 임박 카피를 감춘다', () => {
    render(<HomeHero {...base} dday={7} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
