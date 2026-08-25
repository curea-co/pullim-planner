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

/**
 * 서버 결과가 화면에 떠 있는가.
 *
 * 하단 고지 문구("실제 생성 규칙으로 계산된…")를 표식으로 쓰던 것을 보조 문구 정리(2026-08-24)로
 * 걷어냈다. 대신 **'보류' 배지**로 가른다 — 창(평일 18–23) 밖 07:30 루틴을 휴리스틱 폴백은
 * 보류로 표시하지만, 서버 dry-run 은 BE bake 규칙 그대로라 보류 개념 자체가 없다.
 */
function expectServerResultShown() {
  expect(screen.getByText('07:30–08:00')).toBeInTheDocument();
  expect(screen.queryByText(/보류/)).not.toBeInTheDocument();
}

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
    // 서버 응답 전에는 휴리스틱 폴백이 같은 시각을 '보류'로 그린다 — 서버 결과가 올 때까지 기다린다.
    await waitFor(() => expectServerResultShown());

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
    expect(screen.queryByText('07:30–08:00')).not.toBeInTheDocument();
  });

  it('루틴 내용이 같으면 배열 참조가 새로 와도 다시 부르지 않는다', async () => {
    const onServerPreview = jest.fn<Promise<PreviewDay[] | null>, []>()
      .mockResolvedValue(serverDay('07:30', '08:00'));

    const { rerender } = renderStep4([routine('07:30', '08:00')], onServerPreview);
    // 서버 응답 전에는 휴리스틱 폴백이 같은 시각을 '보류'로 그린다 — 서버 결과가 올 때까지 기다린다.
    await waitFor(() => expectServerResultShown());

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

    await waitFor(() => expectServerResultShown());
    expect(onServerPreview).toHaveBeenCalledTimes(1);
  });
});
