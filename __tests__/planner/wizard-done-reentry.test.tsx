/**
 * 완료 화면의 URL 계약 — "성공 후 URL 이 그대로면 중복 생성이 열린다" 회귀 방지 (codex).
 *
 * 활성화에 성공하면 위저드 URL 을 생성 표식(`?created=`)이 붙은 URL 로 덮는다. 새로고침·
 * 히스토리 재방문으로 그 엔트리에 다시 들어와도 빈 위저드가 열리지 않아야 하고, 활성화가
 * 실패했을 때는 표식도 완료 화면도 남지 않아야 한다.
 */
import { act, render, screen, fireEvent } from '@testing-library/react';

let mockSearch = '';
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/planner/manage/new',
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };
jest.mock('sonner', () => ({
  // 팩토리는 import 시점에 실행되므로 mockToast 는 호출 시점에 늦게 읽는다.
  toast: {
    success: (...args: unknown[]) => mockToast.success(...args),
    error: (...args: unknown[]) => mockToast.error(...args),
    warning: (...args: unknown[]) => mockToast.warning(...args),
  },
}));

const mockCreate = jest.fn();
const mockActivate = jest.fn();
jest.mock('@/lib/planner/client', () => ({
  plannerClient: {
    create: (...args: unknown[]) => mockCreate(...args),
    activate: (...args: unknown[]) => mockActivate(...args),
    preview: jest.fn(),
  },
  toWriteInput: (patch: unknown) => patch,
}));

jest.mock('@/lib/planner/pullim-client', () => ({
  pullimPlannerClient: { routines: jest.fn().mockResolvedValue([]) },
  pullimToRoutine: (r: unknown) => r,
}));

// 위저드 본체는 이 테스트의 관심사가 아니다 — 4단계까지 몰고 가는 대신 활성화 콜백만 노출한다.
jest.mock('@/components/features/planner-manage/presenters/NewPlannerPresenter', () => ({
  __esModule: true,
  default: (props: { onActivate: (form: unknown, summary?: unknown) => void }) => (
    <button type="button" onClick={() => props.onActivate(mockForm, mockSummary)}>
      위저드(테스트) 활성화
    </button>
  ),
}));

import { initialPlannerForm } from '@/components/features/planner-builder/components/builder-types';
import NewPlannerContainer from '@/components/features/planner-manage/containers/NewPlannerContainer';

const mockForm = {
  ...initialPlannerForm,
  examType: 'mock' as const,
  examName: '2026 9월 모의평가',
  examStartDate: '2026-09-01',
  subjectUnits: { 국어: ['화법과 작문'] },
  routineIds: [],
};
const mockSummary = { previewDays: 7, previewBlocks: 21, source: 'local' as const };

const WIZARD = '위저드(테스트) 활성화';
const DONE_HEADING = '시간표가 활성화됐어요';

async function renderContainer() {
  const utils = render(<NewPlannerContainer />);
  // 루틴 fetch effect flush
  await act(async () => {});
  return utils;
}

beforeEach(() => {
  mockSearch = '';
  jest.clearAllMocks();
  window.history.replaceState(null, '', '/planner/manage/new');
});

describe('활성화 성공 — 완료 화면과 생성 표식', () => {
  it('URL 을 생성 표식으로 덮어 빈 위저드로 되돌아갈 수 없게 한다', async () => {
    mockCreate.mockResolvedValue({ id: 'planner-1', name: '2026 9월 모의평가' });
    mockActivate.mockResolvedValue(undefined);

    await renderContainer();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: WIZARD })); });

    expect(screen.getByRole('heading', { name: DONE_HEADING })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/planner/manage/new');
    expect(window.location.search).toBe('?created=planner-1');
    // 완료 화면으로 갈아끼우는 것뿐 — 새 히스토리 엔트리를 쌓지 않는다.
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('표식을 붙여도 현재 엔트리의 history state payload 를 지우지 않는다', async () => {
    mockCreate.mockResolvedValue({ id: 'planner-1', name: '2026 9월 모의평가' });
    mockActivate.mockResolvedValue(undefined);
    // 이 엔트리에 이미 실려 있는 state — App Router 가 뒤로/앞으로 복원에 쓰는 내부 트리와
    // 그 밖의 payload 를 흉내낸다. 표식을 붙이면서 이걸 통째로 날리면 복원이 깨진다 (codex).
    window.history.replaceState(
      { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: 'stub' }, keep: 'me' },
      '',
      '/planner/manage/new',
    );

    await renderContainer();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: WIZARD })); });

    expect(window.location.search).toBe('?created=planner-1');
    expect(window.history.state).toMatchObject({
      __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: 'stub' },
      keep: 'me',
    });
    // 단 Next 내부 표식(__NA/_N)은 실어 보내지 않는다 — 실어 보내면 App Router 가 패치한
    // replaceState 가 "내부 호출"로 보고 URL 동기화를 건너뛴다. 실제 앱에서는 Next 가
    // 현재 엔트리의 __NA 를 다시 붙여 주므로 복원 정보는 그대로 남는다.
    expect(window.history.state).not.toHaveProperty('__NA');
  });
});

describe('활성화 실패(부분 성공) — 완료 화면을 띄우지 않는다', () => {
  it('생성만 성공하면 경고 후 관리 화면으로 보내고 표식도 남기지 않는다', async () => {
    mockCreate.mockResolvedValue({ id: 'planner-1', name: '2026 9월 모의평가' });
    mockActivate.mockRejectedValue(new Error('activate failed'));

    await renderContainer();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: WIZARD })); });

    expect(screen.queryByRole('heading', { name: DONE_HEADING })).not.toBeInTheDocument();
    expect(mockToast.warning).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/planner/manage');
    expect(window.location.search).toBe('');
  });

  it('생성부터 실패하면 완료 화면도 표식도 없다', async () => {
    mockCreate.mockRejectedValue(new Error('create failed'));

    await renderContainer();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: WIZARD })); });

    expect(screen.queryByRole('heading', { name: DONE_HEADING })).not.toBeInTheDocument();
    expect(mockActivate).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });
});

describe('생성 표식 URL 재진입 — 빈 위저드를 다시 열지 않는다', () => {
  it('리캡이 없는 채로 표식만 있으면 위저드 대신 관리 화면으로 보낸다', async () => {
    // 새로고침·히스토리 재방문 — 리캡은 메모리에만 있어 복원할 수 없다.
    mockSearch = 'created=planner-1';

    await renderContainer();

    expect(screen.queryByRole('button', { name: WIZARD })).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/planner/manage');
    // 위저드가 없으니 같은 입력으로 한 번 더 create 할 경로 자체가 없다.
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
