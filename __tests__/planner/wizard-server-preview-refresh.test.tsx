import { render, screen, waitFor } from '@testing-library/react';

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));

import { PStep4Confirm } from '@/components/features/planner-builder/components/step-content';
import {
  initialPlannerForm,
  type PlannerForm,
  type ScopeState,
} from '@/components/features/planner-builder/components/builder-types';
import type { Routine } from '@/lib/mock';
import type { PreviewDay } from '@/lib/planner/preview-map';

const scope: ScopeState = { answer: null, electives: {}, progressCut: {}, settled: [], manualUnits: [] };

const form: PlannerForm = {
  ...initialPlannerForm,
  routineIds: ['r1'],
  subjectUnits: { korean: ['화법과 작문 1단원'] },
};

const routine = (startTime: string, endTime: string): Routine => ({
  id: 'r1', title: '아침 영단어', subject: 'english', type: 'concept',
  startTime, endTime, weekdays: [0, 1, 2, 3, 4],
});

/** 서버 dry-run 결과 한 건 — 루틴이 몇 시에 굽혔는지가 그대로 드러난다. */
const serverDay = (start: string, end: string): PreviewDay[] => [{
  offset: 0, monthDay: '8/25', weekdayLabel: '월', isWeekend: false, isExamDay: false,
  items: [{ start, end, subjectLabel: '영어', type: 'concept', unitLabel: '아침 영단어', isRoutine: true }],
}];

/** 서버 경로일 때만 뜨는 고지 — 휴리스틱 폴백과 구분하는 표식. */
const SERVER_NOTE = /실제 생성 규칙으로 계산된 미리보기예요/;

function renderStep4(routines: Routine[], onServerPreview: () => Promise<PreviewDay[] | null>) {
  return render(
    <PStep4Confirm
      form={form}
      setForm={() => {}}
      scope={scope}
      routines={routines}
      onServerPreview={onServerPreview}
    />,
  );
}

describe('4단계 서버 미리보기 — 루틴 목록 변화 반영', () => {
  it('루틴 시각이 바뀌면 서버 미리보기를 다시 불러온다', async () => {
    // 서버 preview 요청 본문은 루틴 id 만 싣고 시각은 서버가 DB 에서 읽는다 —
    // '시간 안쪽으로 옮기기'(PATCH)로 원본 시각만 바뀌면 폼은 그대로라 재요청이 없으면
    // 미리보기가 옮기기 전 시각에 머문다.
    const onServerPreview = jest.fn<Promise<PreviewDay[] | null>, []>()
      .mockResolvedValueOnce(serverDay('07:30', '08:00'))
      .mockResolvedValueOnce(serverDay('18:00', '18:30'));

    const { rerender } = renderStep4([routine('07:30', '08:00')], onServerPreview);
    expect(await screen.findByText('07:30–08:00')).toBeInTheDocument();
    expect(onServerPreview).toHaveBeenCalledTimes(1);

    rerender(
      <PStep4Confirm
        form={form}
        setForm={() => {}}
        scope={scope}
        routines={[routine('18:00', '18:30')]}
        onServerPreview={onServerPreview}
      />,
    );

    await waitFor(() => expect(onServerPreview).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('18:00–18:30')).toBeInTheDocument();
    expect(screen.queryByText('07:30–08:00')).not.toBeInTheDocument();
  });

  it('재요청이 끝나기 전에는 이전 서버 결과를 계속 보여주지 않는다', async () => {
    const onServerPreview = jest.fn<Promise<PreviewDay[] | null>, []>()
      .mockResolvedValueOnce(serverDay('07:30', '08:00'))
      .mockReturnValueOnce(new Promise(() => {})); // 두 번째 요청은 계속 진행 중

    const { rerender } = renderStep4([routine('07:30', '08:00')], onServerPreview);
    expect(await screen.findByText(SERVER_NOTE)).toBeInTheDocument();

    rerender(
      <PStep4Confirm
        form={form}
        setForm={() => {}}
        scope={scope}
        routines={[routine('18:00', '18:30')]}
        onServerPreview={onServerPreview}
      />,
    );

    await waitFor(() => expect(onServerPreview).toHaveBeenCalledTimes(2));
    // 이전 결과는 즉시 무효 — 휴리스틱 폴백으로 내려앉는다(옛 시각을 계속 보여주지 않는다).
    expect(screen.queryByText(SERVER_NOTE)).not.toBeInTheDocument();
  });

  it('루틴 내용이 같으면 배열 참조가 새로 와도 다시 부르지 않는다', async () => {
    const onServerPreview = jest.fn<Promise<PreviewDay[] | null>, []>()
      .mockResolvedValue(serverDay('07:30', '08:00'));

    const { rerender } = renderStep4([routine('07:30', '08:00')], onServerPreview);
    expect(await screen.findByText(SERVER_NOTE)).toBeInTheDocument();

    // 컨테이너가 매 렌더 새 배열을 만들어도 재요청이 늘지 않아야 한다.
    for (let i = 0; i < 3; i += 1) {
      rerender(
        <PStep4Confirm
          form={form}
          setForm={() => {}}
          scope={scope}
          routines={[routine('07:30', '08:00')]}
          onServerPreview={onServerPreview}
        />,
      );
    }

    await waitFor(() => expect(screen.getByText(SERVER_NOTE)).toBeInTheDocument());
    expect(onServerPreview).toHaveBeenCalledTimes(1);
  });
});
