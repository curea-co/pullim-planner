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

/**
 * 축이 둘인데 낱말을 나눠 썼다 (QA F-07).
 *
 * 점수는 **수준**(안전·주의·위험), trend 는 **방향**이다. 그런데 방향 축이 「안정」·「주의」를
 * 쓰는 바람에 한 화면에 「안전도 42 · 위험」과 「안정」이 나란히 떴고, 「주의」는 양쪽에 있어
 * 점수 50~69 를 뜻하기도 「떨어지는 중」을 뜻하기도 했다.
 */
describe('점수 축과 추세 축이 같은 낱말을 쓰지 않는다 (F-07)', () => {
  const snap = (score: number, trend: 'rising' | 'stable' | 'falling') => ({
    score, trend, factors: [], recommendBreak: false,
  });

  it('낮은 점수 + 안정 추세에서 「위험」과 「안정」이 같이 뜨지 않는다', () => {
    render(
      <ConditionBurnoutPanel condition={3} burnout={snap(42, 'stable')} onConditionChange={() => {}} defaultOpen />,
    );
    expect(screen.getByText('안전도 42 · 위험')).toBeInTheDocument();
    expect(screen.queryByText('안정')).toBeNull();     // 종전 문구
    expect(screen.getByText('유지 중')).toBeInTheDocument();
  });

  it('「주의」는 점수 축에만 쓴다 — 추세 하락은 방향으로 말한다', () => {
    render(
      <ConditionBurnoutPanel condition={3} burnout={snap(80, 'falling')} onConditionChange={() => {}} defaultOpen />,
    );
    expect(screen.getByText('안전도 80 · 안전')).toBeInTheDocument();
    expect(screen.getByText('나빠지는 중')).toBeInTheDocument();
    expect(screen.queryByText('주의')).toBeNull();     // 점수는 안전인데 추세가 「주의」로 뜨면 모순
  });

  it('추세는 어느 축의 말인지 화면에 적힌다', () => {
    render(
      <ConditionBurnoutPanel condition={3} burnout={snap(80, 'rising')} onConditionChange={() => {}} defaultOpen />,
    );
    expect(screen.getByText('최근 추세')).toBeInTheDocument();
    expect(screen.getByText('회복 중')).toBeInTheDocument();
  });
});
