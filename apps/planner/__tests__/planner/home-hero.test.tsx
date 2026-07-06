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
});
