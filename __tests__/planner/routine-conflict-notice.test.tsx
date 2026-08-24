import { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));

import { initialPlannerForm, type PlannerForm } from '@/components/features/planner-builder/components/builder-types';
import { RoutineConflictNotice } from '@/components/features/planner-builder/components/routine-conflict-notice';
import type { Routine } from '@/lib/mock';

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

const routine = (over: Partial<Routine> & Pick<Routine, 'id'>): Routine => ({
  title: '루틴', subject: 'math', type: 'concept',
  startTime: '19:00', endTime: '19:50', weekdays: [0, 1, 2, 3, 4],
  ...over,
});

/** 평일 07:30 — 기본 창(평일 18–23)을 완전히 벗어난다. */
const morning = routine({ id: 'r1', title: '아침 영단어', startTime: '07:30', endTime: '08:00' });

function Harness({
  routines, onUpdateRoutine, initial,
}: {
  routines: Routine[];
  onUpdateRoutine?: (id: string, patch: { startTime: string; endTime: string }) => Promise<void>;
  initial?: Partial<PlannerForm>;
}) {
  const [form, setForm] = useState<PlannerForm>({ ...initialPlannerForm, routineIds: ['r1'], ...initial });
  return (
    <>
      <RoutineConflictNotice form={form} setForm={setForm} routines={routines} onUpdateRoutine={onUpdateRoutine} />
      <output data-testid="hours">
        평일 {form.weekdayHours.start}-{form.weekdayHours.end} / 루틴 {form.routineIds.join(',') || '없음'}
      </output>
    </>
  );
}

describe('루틴 충돌 배너', () => {
  it('어긋난 루틴이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<Harness routines={[routine({ id: 'r1' })]} />);
    expect(container.querySelector('section')).toBeNull();
  });

  it('창 밖 루틴을 이름·시각과 함께 알린다', () => {
    render(<Harness routines={[morning]} />);
    expect(screen.getByText('루틴 1개가 학습 시간과 어긋나요')).toBeInTheDocument();
    expect(screen.getByText('아침 영단어')).toBeInTheDocument();
    expect(screen.getByText(/07:30–08:00 인데 평일 학습 시간\(18:00–23:00\)을 벗어나 있어요/)).toBeInTheDocument();
  });

  it('넓히기는 그 루틴이 들어갈 만큼만 창을 넓힌다', () => {
    render(<Harness routines={[morning]} />);
    click('학습 시간 07:00–23:00 로 넓히기');
    expect(screen.getByTestId('hours')).toHaveTextContent('평일 7-23');
  });

  it('빼기는 폼의 routineIds 에서만 지운다 — 루틴 자체는 건드리지 않는다', () => {
    const onUpdateRoutine = jest.fn();
    render(<Harness routines={[morning]} onUpdateRoutine={onUpdateRoutine} />);
    click('이 시간표에서 빼기');
    expect(screen.getByTestId('hours')).toHaveTextContent('루틴 없음');
    expect(onUpdateRoutine).not.toHaveBeenCalled();
  });

  it('옮기기는 확인 없이 저장하지 않는다 — 다이얼로그를 먼저 띄운다', async () => {
    const onUpdateRoutine = jest.fn().mockResolvedValue(undefined);
    render(<Harness routines={[morning]} onUpdateRoutine={onUpdateRoutine} />);

    click('시간 안쪽으로 옮기기');
    expect(onUpdateRoutine).not.toHaveBeenCalled();
    // 다른 시간표에도 반영된다는 사실을 확인 문구가 알린다.
    expect(screen.getByText(/다른 시간표에도 함께 쓰이는 내 루틴/)).toBeInTheDocument();

    click('루틴 시간 바꾸기');
    await waitFor(() =>
      expect(onUpdateRoutine).toHaveBeenCalledWith('r1', { startTime: '18:00', endTime: '18:30' }),
    );
  });

  it('저장 핸들러가 없으면 옮기기 조치를 노출하지 않는다', () => {
    render(<Harness routines={[morning]} />);
    expect(screen.queryByRole('button', { name: '시간 안쪽으로 옮기기' })).not.toBeInTheDocument();
  });

  it('루틴끼리 겹치면 넓히기를 주지 않는다 — 창을 넓혀도 안 풀린다', () => {
    const rs = [
      routine({ id: 'r1', title: '수학 인강', startTime: '19:00', endTime: '20:00' }),
      routine({ id: 'r2', title: '영어 듣기', startTime: '19:30', endTime: '20:30' }),
    ];
    render(<Harness routines={rs} onUpdateRoutine={jest.fn()} initial={{ routineIds: ['r1', 'r2'] }} />);
    expect(screen.getByText(/평일은 다른 루틴과 겹쳐요/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /넓히기/ })).not.toBeInTheDocument();
    // 옮기기는 다른 루틴을 피해 자리를 찾으므로 겹침도 푼다.
    expect(screen.getByRole('button', { name: '시간 안쪽으로 옮기기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이 시간표에서 빼기' })).toBeInTheDocument();
  });

  it('창마다 사유가 다르면 둘 다 적고, 넓히기로 안 끝난다고 알린다', () => {
    // 평일은 창(18–23) 밖, 주말은 다른 루틴과 겹침 — 첫 사유만 보면 주말 쪽이 통째로 숨는다(Codex).
    const rs = [
      routine({ id: 'r0', title: '주말 모의고사', startTime: '10:00', endTime: '11:40', weekdays: [5] }),
      routine({ id: 'r1', title: '아침 영단어', startTime: '10:30', endTime: '11:00', weekdays: [0, 5] }),
    ];
    render(<Harness routines={rs} onUpdateRoutine={jest.fn()} initial={{ routineIds: ['r0', 'r1'] }} />);
    const card = screen.getByText(/10:30–11:00 인데/);
    expect(card).toHaveTextContent('평일 학습 시간(18:00–23:00)을 벗어나 있어요');
    expect(card).toHaveTextContent('주말은 다른 루틴과 겹쳐요');
    expect(screen.getByText('학습 시간을 넓혀도 루틴끼리의 겹침은 남아요.')).toBeInTheDocument();
  });

  it('창 밖이면서 겹치면 넓히기와 겹침 안내를 둘 다 준다', () => {
    // Codex 재현 — 평일 창 18–23 에 07:00–08:00 · 07:30–08:30 을 함께 골랐다. 겹침이
    // 창 사유를 덮으면 뒤 루틴 카드에서 '넓히기'가 사라져 창 충돌 자체를 못 본다.
    const rs = [
      routine({ id: 'r1', title: '아침 영단어', startTime: '07:00', endTime: '08:00' }),
      routine({ id: 'r2', title: '아침 수학', startTime: '07:30', endTime: '08:30' }),
    ];
    render(<Harness routines={rs} initial={{ routineIds: ['r1', 'r2'] }} />);

    const summary = screen.getByText(/07:30–08:30 인데/);
    expect(summary).toHaveTextContent('평일 학습 시간(18:00–23:00)을 벗어나 있어요');
    expect(summary).toHaveTextContent('평일은 다른 루틴과 겹쳐요');

    // 겹침 안내는 겹치는 쪽 카드에만 붙는다(앞 루틴은 창 밖이기만 하다).
    const card = within(summary.closest('li') as HTMLElement);
    expect(card.getByText('학습 시간을 넓혀도 루틴끼리의 겹침은 남아요.')).toBeInTheDocument();

    // 넓히기는 07:30 루틴을 담을 만큼 창을 되돌린다 — 겹침 때문에 사라지지 않는다.
    fireEvent.click(card.getByRole('button', { name: '학습 시간 07:00–23:00 로 넓히기' }));
    expect(screen.getByTestId('hours')).toHaveTextContent('평일 7-23');
  });

  it('조치 대상은 fetch 순이 아니라 선택 순서로 정해진다', () => {
    // Codex 재현 — 루틴 목록은 [r1, r2] 로(최신순 등) 오지만 선택 순서는 [r2, r1].
    // 미리보기는 선택 순서대로 훑어 r1 을 보류로 그리므로 배너도 r1 을 가리켜야 한다.
    const rs = [
      routine({ id: 'r1', title: '수학 인강', startTime: '19:00', endTime: '20:00' }),
      routine({ id: 'r2', title: '영어 듣기', startTime: '19:30', endTime: '20:30' }),
    ];
    render(<Harness routines={rs} initial={{ routineIds: ['r2', 'r1'] }} />);
    expect(screen.getByText('루틴 1개가 학습 시간과 어긋나요')).toBeInTheDocument();
    expect(screen.getByText('수학 인강')).toBeInTheDocument();
    expect(screen.queryByText('영어 듣기')).not.toBeInTheDocument();
    expect(screen.getByText(/19:00–20:00 인데 평일은 다른 루틴과 겹쳐요/)).toBeInTheDocument();
  });

  it('평일·주말 양쪽에 걸리면 한 카드로 묶고 양쪽을 넓힌다', () => {
    const everyday = routine({ id: 'r1', title: '아침 영단어', startTime: '07:30', endTime: '08:00', weekdays: [0, 1, 2, 3, 4, 5, 6] });
    render(<Harness routines={[everyday]} />);
    expect(screen.getByText('루틴 1개가 학습 시간과 어긋나요')).toBeInTheDocument();
    click('평일·주말 학습 시간 넓히기');
    expect(screen.getByTestId('hours')).toHaveTextContent('평일 7-23');
  });
});
