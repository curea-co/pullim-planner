/**
 * 완료 화면 — 활성화 직후 "무엇이 만들어졌는지" 를 보여주는 자리.
 *
 * 지키려는 것: **약속하지 않은 기능을 암시하지 않는다.** 완료 기록으로 시간표를 자동
 * 조정하는 기능은 아직 없다.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { WizardDone, type WizardDoneSummary } from '@/components/features/planner-builder/components/wizard-done';

const summary = (over: Partial<WizardDoneSummary> = {}): WizardDoneSummary => ({
  plannerName: '2026 9월 모의평가',
  ddayLabel: 'D-8',
  examLabel: '모의고사',
  subjectCount: 3,
  unitCount: 27,
  previewBlocks: 21,
  previewDays: 7,
  patternLabel: '집중형',
  patternSpec: '50분 + 10분',
  routineCount: 2,
  ...over,
});

const noop = () => {};

describe('위저드 완료 화면', () => {
  it('방금 만든 시간표를 리캡으로 보여준다', () => {
    render(<WizardDone summary={summary()} onHome={noop} onManage={noop} />);
    expect(screen.getByRole('heading', { name: '시간표가 활성화됐어요' })).toBeInTheDocument();
    expect(screen.getByText('모의고사 · D-8')).toBeInTheDocument();
    expect(screen.getByText('3과목 · 27단원')).toBeInTheDocument();
    expect(screen.getByText('7일 21개 · 집중형(50분 + 10분)')).toBeInTheDocument();
    expect(screen.getByText('2개 적용')).toBeInTheDocument();
  });

  it('자동 조정을 약속하지 않는다', () => {
    render(<WizardDone summary={summary()} onHome={noop} onManage={noop} />);
    expect(screen.getByText(/자동으로 시간표를 고쳐주진 않아요/)).toBeInTheDocument();
  });

  it('시험일이 없으면 D-day 를 지어내지 않는다', () => {
    render(<WizardDone summary={summary({ ddayLabel: null })} onHome={noop} onManage={noop} />);
    expect(screen.getByText('모의고사')).toBeInTheDocument();
    expect(screen.queryByText(/D-/)).not.toBeInTheDocument();
  });

  it('루틴 게이트가 꺼져 있으면 루틴 줄을 내린다', () => {
    // 고를 수 없는 항목을 '없음' 으로 보여주지 않는다 — 기존 요약 화면과 같은 규칙.
    render(<WizardDone summary={summary({ routineCount: null })} onHome={noop} onManage={noop} />);
    expect(screen.queryByText('내 루틴')).not.toBeInTheDocument();
  });

  it('홈·관리 두 갈래로 보낸다', () => {
    const onHome = jest.fn();
    const onManage = jest.fn();
    render(<WizardDone summary={summary()} onHome={onHome} onManage={onManage} />);
    fireEvent.click(screen.getByRole('button', { name: '오늘 시간표 보기' }));
    fireEvent.click(screen.getByRole('button', { name: '시간표 관리' }));
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(onManage).toHaveBeenCalledTimes(1);
  });
});
