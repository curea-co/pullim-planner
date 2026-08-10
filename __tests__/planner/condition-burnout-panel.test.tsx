import { render, screen } from '@testing-library/react';
import { ConditionBurnoutPanel } from '@/components/features/planner-home/components/condition-burnout-panel';
import { todayBurnout } from '@/lib/mock';

describe('ConditionBurnoutPanel', () => {
  it('스냅샷이 있으면 리본에 안전도 점수·판정을 표시한다', () => {
    render(
      <ConditionBurnoutPanel condition={3} burnout={todayBurnout} onConditionChange={() => {}} />,
    );
    expect(screen.getByText(`안전도 ${todayBurnout.score} · 주의`)).toBeInTheDocument();
  });

  // 완료 기록이 없으면 "0점·위험" 대신 판정 보류 '–' (사용자 확정 08-03)
  it('스냅샷이 null이면 리본에 "안전도 –"를 표시한다', () => {
    render(<ConditionBurnoutPanel condition={3} burnout={null} onConditionChange={() => {}} />);
    expect(screen.getByText('안전도 –')).toBeInTheDocument();
    expect(screen.queryByText(/위험/)).not.toBeInTheDocument();
  });

  it('스냅샷이 null이면 펼친 카드에 데이터 부족 안내를 보여준다', () => {
    render(
      <ConditionBurnoutPanel condition={3} burnout={null} onConditionChange={() => {}} defaultOpen />,
    );
    expect(screen.getByText(/아직 데이터가 부족해요/)).toBeInTheDocument();
  });
});
