/**
 * 삭제된 루틴의 id 가 서버로 나가지 않는다 — 수정 화면이 영구히 저장 불가가 되던 회귀 방지.
 *
 * 루틴 삭제는 하드 삭제인데 그 루틴이 구워 둔 블록은 남는다. 수정 화면의 프리필은 그 블록에서
 * 역산한 `appliedRoutineIds` 를 쓰므로 **죽은 id 가 폼에 되살아난다.** 그 상태로 저장하면
 * pullim-api 가 400 `적용할 수 없는 루틴이 포함되어 있습니다.` 로 막고, 루틴 선택 UI 로도
 * 그 id 를 지울 수 없어 그 시간표는 이름 한 글자도 못 바꾸게 된다. (QA 2026-09-04 N-01)
 *
 * 반대 방향도 같이 고정한다 — **루틴 목록 조회가 실패했을 때는 거르면 안 된다.** 걸러 버리면
 * 빈/축소된 집합이 "원하는 적용 집합 전체"로 나가 BE 가 나머지를 **해제(블록 삭제)** 한다.
 */
import { Suspense } from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api-client';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/planner/manage/p1/edit',
  useSearchParams: () => new URLSearchParams(''),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };
jest.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => mockToast.success(...a),
    error: (...a: unknown[]) => mockToast.error(...a),
    warning: (...a: unknown[]) => mockToast.warning(...a),
  },
}));

const mockUpdate = jest.fn().mockResolvedValue({});
const mockPreview = jest.fn().mockResolvedValue({ blocks: [] });
const mockList = jest.fn();
jest.mock('@/lib/planner/client', () => ({
  plannerClient: {
    list: (...a: unknown[]) => mockList(...a),
    update: (...a: unknown[]) => mockUpdate(...a),
    preview: (...a: unknown[]) => mockPreview(...a),
  },
  apiToPlanner: (p: unknown) => p,
  toWriteInput: (patch: unknown) => patch,
}));

const mockRoutines = jest.fn();
jest.mock('@/lib/planner/pullim-client', () => ({
  pullimPlannerClient: { routines: (...a: unknown[]) => mockRoutines(...a) },
  pullimToRoutine: (r: unknown) => r,
}));

// 위저드 본체는 관심사가 아니다 — 저장 콜백만 노출한다.
jest.mock('@/components/features/planner-manage/presenters/EditPlannerPresenter', () => ({
  __esModule: true,
  default: (props: {
    form: unknown;
    onSave: (form: unknown) => void;
    onServerPreview?: () => Promise<unknown>;
  }) => (
    <>
      <button type="button" onClick={() => props.onSave(props.form)}>
        저장(테스트)
      </button>
      <button type="button" onClick={() => void props.onServerPreview?.()}>
        미리보기(테스트)
      </button>
    </>
  ),
}));

import EditPlannerContainer from '@/components/features/planner-manage/containers/EditPlannerContainer';

const SAVE = '저장(테스트)';
const PREVIEW = '미리보기(테스트)';

/** 프리필의 출처 — 살아 있는 r1 과, 루틴 행이 지워진 dead 가 함께 실려 온다. */
const plannerFixture = {
  id: 'p1',
  name: '9월 모의고사',
  examType: 'mock',
  examStartDate: '2026-09-01',
  examEndDate: '2026-09-01',
  target: { kind: 'grade', value: 2 },
  motto: '',
  weekdayHours: { start: 18, end: 23 },
  weekendHours: { start: 10, end: 22 },
  subjectUnits: { korean: ['화법과 작문 1단원'] },
  blockPattern: 'focused',
  appliedRoutineIds: ['r1', 'dead'],
  weaknessAutoReflect: false,
  motivationStyle: 'guided',
  status: 'draft',
};

const liveRoutine = {
  id: 'r1', title: '아침 영단어', subject: 'english', type: 'concept',
  startTime: '07:30', endTime: '08:00', weekdays: [0, 1, 2, 3, 4],
};

/** 저장 요청 본문에 실린 routineId 목록. */
function sentRoutineIds(): string[] | undefined {
  const body = mockUpdate.mock.calls.at(-1)?.[1] as
    | { routineApplications?: { routineId: string }[] }
    | undefined;
  return body?.routineApplications?.map((a) => a.routineId);
}

async function renderContainer() {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <EditPlannerContainer params={Promise.resolve({ id: 'p1' })} />
      </Suspense>,
    );
  });
  await waitFor(() => expect(screen.getByText(SAVE)).toBeInTheDocument());
}

async function renderAndSave() {
  // `use(params)` 가 서스펜드하므로 경계가 필요하다 — 실제 page.tsx 와 같은 모양.
  // render 를 act 로 감싸 서스펜스 해제와 로드 effect(planner·루틴)를 한 번에 flush 한다.
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <EditPlannerContainer params={Promise.resolve({ id: 'p1' })} />
      </Suspense>,
    );
  });
  await waitFor(() => expect(screen.getByText(SAVE)).toBeInTheDocument());
  fireEvent.click(screen.getByText(SAVE));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue([plannerFixture]);
  mockUpdate.mockResolvedValue({});
});

describe('수정 저장 — 죽은 루틴 id', () => {
  it('루틴 목록을 받았으면 삭제된 id 를 떨군다', async () => {
    mockRoutines.mockResolvedValue([liveRoutine]);
    await renderAndSave();
    expect(sentRoutineIds()).toEqual(['r1']);
  });

  it('루틴 목록 조회가 실패하면 거르지 않는다 — 잘못 걸러 적용 루틴을 해제하지 않기 위해', async () => {
    mockRoutines.mockRejectedValue(new Error('network'));
    await renderAndSave();
    expect(sentRoutineIds()).toEqual(['r1', 'dead']);
  });

  it('루틴을 전부 지운 사용자는 빈 집합을 보낸다 — 남은 블록이 해제된다', async () => {
    mockRoutines.mockResolvedValue([]);
    await renderAndSave();
    expect(sentRoutineIds()).toEqual([]);
  });
});

/**
 * 미리보기 400 을 사용자에게 띄울지는 **루틴 목록을 받았는지**에 달려 있다.
 *
 * 못 받았을 때는 일부러 거르지 않고 보내므로(위 데이터 손실 방지), 그때의 400 은 사용자가
 * 고칠 수 있는 입력 오류가 아니라 조회 실패의 2차 증상이다. 그걸 "적용할 수 없는 루틴" 으로
 * 띄우면 목록만 로드되면 저장될 상황인데도 저장이 막힌 줄 알게 된다.
 */
describe('미리보기 400 표면화', () => {
  const rejected = () =>
    Promise.reject(
      new ApiError({
        code: 'COMMON_BAD_REQUEST',
        message: '적용할 수 없는 루틴이 포함되어 있습니다.',
        statusCode: 400,
      }),
    );

  it('목록을 받은 뒤의 400 은 알린다 — 진짜 서버 거부다', async () => {
    mockRoutines.mockResolvedValue([liveRoutine]);
    mockPreview.mockImplementation(rejected);
    await renderContainer();
    fireEvent.click(screen.getByText(PREVIEW));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
    expect(mockToast.error).toHaveBeenCalledWith(
      '적용할 수 없는 루틴이 포함되어 있습니다.',
      expect.objectContaining({ id: expect.any(String) }),
    );
  });

  it('목록을 못 받았을 때의 400 은 조용히 폴백한다 — 조회 실패의 2차 증상이다', async () => {
    mockRoutines.mockRejectedValue(new Error('network'));
    mockPreview.mockImplementation(rejected);
    await renderContainer();
    fireEvent.click(screen.getByText(PREVIEW));
    await waitFor(() => expect(mockPreview).toHaveBeenCalled());
    expect(mockToast.error).not.toHaveBeenCalled();
  });
});
