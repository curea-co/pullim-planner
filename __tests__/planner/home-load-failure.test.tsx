/**
 * 홈에서 **조회 실패**와 **계획 없음**을 화면이 구분한다.
 *
 * 기간 조회는 전부 아니면 전무라, 실패하면 창이 통째로 빈다. 그 빈 달력은 "이 기간엔 계획이
 * 없다"와 픽셀 단위로 같아서, 사용자는 자기 시간표가 지워졌다고 읽는다. 히어로 쪽은 더 나쁘다 —
 * 목록 조회가 실패하면 `active=null` 이 되어 "아직 시간표가 없어요"라고 **틀린 사실을 단언**한다.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import HomePresenter from '@/components/features/planner-home/presenters/HomePresenter';

const base = {
  view: 'week' as const,
  examName: '',
  dday: 0,
  burnout: null,
  condition: null,
  onConditionChange: () => {},
  daySummary: { done: 0, total: 0 },
  weekMeta: { totalHours: 0, completedHours: 0 },
  monthMeta: { totalBlocks: 0 },
  heroDaySummary: { done: 0, total: 0 },
  heroWeekMeta: { totalHours: 0, completedHours: 0 },
  offset: 0,
  onPrev: () => {},
  onNext: () => {},
  onReset: () => {},
  onJumpOffset: () => {},
  onChangeView: () => {},
  onNavigate: () => {},
};

describe('홈 조회 실패 표시', () => {
  it('목록 실패면 "아직 시간표가 없어요"라고 말하지 않는다', () => {
    render(<HomePresenter {...base} hasActivePlanner={false} loadError />);

    expect(screen.queryByText('아직 시간표가 없어요')).toBeNull();
    expect(screen.getByText('학습 현황을 불러오지 못했어요')).toBeInTheDocument();
    expect(screen.getByText('시간표를 불러오지 못했어요')).toBeInTheDocument();
  });

  it('시간표가 정말 없을 때는 종전 빈 상태 카피 그대로다 (QA #7 회귀 방지)', () => {
    render(<HomePresenter {...base} hasActivePlanner={false} />);

    expect(screen.getByText('아직 시간표가 없어요')).toBeInTheDocument();
    expect(screen.queryByText('학습 현황을 불러오지 못했어요')).toBeNull();
  });

  it('기간만 실패하면 히어로는 유효하고 달력 자리에만 실패를 말한다', () => {
    render(<HomePresenter {...base} examName="9월 모평" dday={12} blocksError />);

    expect(screen.getByText('D-12')).toBeInTheDocument();
    expect(screen.getByText('이 기간의 계획을 불러오지 못했어요')).toBeInTheDocument();
  });

  it('[다시 시도]가 onRetry 를 부른다', () => {
    const onRetry = jest.fn();
    render(<HomePresenter {...base} blocksError onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('실패 전에 읽어 둔 시간표가 남아 있어도 실패가 우선이다 — 옛 D-day 를 현재값처럼 보이지 않게', () => {
    // 재시도 중 목록 조회가 다시 실패한 상황: active 는 이전 값이 남아 hasActivePlanner=true 다.
    render(<HomePresenter {...base} examName="9월 모평" dday={12} hasActivePlanner loadError blocksError />);

    expect(screen.queryByText('D-12')).toBeNull();
    expect(screen.getByText('학습 현황을 불러오지 못했어요')).toBeInTheDocument();
  });

  it('히어로 요약만 못 만들면 숨기지 않고 못 불러왔다고 말한다', () => {
    // 이 PR 이 닫으려는 위장 그 자체 — 0 으로 접으면 "계획 없음"과 구분되지 않는다.
    render(<HomePresenter {...base} examName="9월 모평" dday={12} heroSummaryError />);

    expect(screen.getByText('D-12')).toBeInTheDocument();
    expect(screen.getByText('오늘·이번 주 요약을 불러오지 못했어요.')).toBeInTheDocument();
  });

  it('목록 자체가 실패하면 요약 실패 문구는 겹쳐 쓰지 않는다', () => {
    render(<HomePresenter {...base} loadError heroSummaryError />);

    expect(screen.queryByText('오늘·이번 주 요약을 불러오지 못했어요.')).toBeNull();
    expect(screen.getByText('학습 현황을 불러오지 못했어요')).toBeInTheDocument();
  });

  it('실패가 없으면 실패 카드도 없다', () => {
    render(<HomePresenter {...base} examName="9월 모평" dday={12} />);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
