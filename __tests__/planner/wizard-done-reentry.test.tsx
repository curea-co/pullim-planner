/**
 * 완료 화면의 URL 계약 — "성공 후 URL 이 그대로면 중복 생성이 열린다" 회귀 방지 (codex).
 *
 * 활성화에 성공하면 위저드 URL 을 생성 표식(`?created=`)이 붙은 URL 로 덮는다. 새로고침·
 * 히스토리 재방문으로 그 엔트리에 다시 들어와도 빈 위저드가 열리지 않아야 하고, 활성화가
 * 실패했을 때는 표식도 완료 화면도 남지 않아야 한다.
 */
import { useSyncExternalStore } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { flushSync } from 'react-dom';

let mockSearch = '';
/**
 * `useSearchParams` 를 정적 문자열이 아니라 **구독 가능한 store** 로 흉내낸다 — 실제 Next 는
 * `history.replaceState` 와 동기화되므로, 표식을 붙인 순간 값이 바뀌고 렌더가 끼어들 수 있다.
 * 정적 mock 으로는 그 경로 자체가 재현되지 않는다 (codex).
 */
const mockSearchListeners = new Set<() => void>();
function mockSetSearch(next: string) {
  mockSearch = next;
  mockSearchListeners.forEach((listen) => listen());
}
function mockSubscribeSearch(listen: () => void) {
  mockSearchListeners.add(listen);
  return () => { mockSearchListeners.delete(listen); };
}
// jest.mock 팩토리는 `mock` 으로 시작하는 바깥 변수만 참조할 수 있어 별칭으로 넘긴다.
const mockUseSyncExternalStore = useSyncExternalStore;
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/planner/manage/new',
  useSearchParams: () =>
    new URLSearchParams(
      mockUseSyncExternalStore(mockSubscribeSearch, () => mockSearch, () => mockSearch),
    ),
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
/** 4단계가 넘기는 미리보기 집계 — 테스트마다 갈아끼운다(빈 집계 경로 확인용). */
const DEFAULT_SUMMARY = { previewDays: 7, previewBlocks: 21, source: 'local' as const };
let mockSummary: { previewDays: number; previewBlocks: number; source: 'server' | 'local' } =
  DEFAULT_SUMMARY;

const WIZARD = '위저드(테스트) 활성화';
const DONE_HEADING = '시간표가 활성화됐어요';

async function renderContainer() {
  const utils = render(<NewPlannerContainer />);
  // 루틴 fetch effect flush
  await act(async () => {});
  return utils;
}

/**
 * 실제 Next 처럼 `history.replaceState` 와 `useSearchParams` 를 **동기화**한다 — 표식을 붙이면
 * 그 순간부터 `created` 가 읽힌다. 정적 문자열 mock 이던 시절에는 표식이 붙은 뒤의 렌더를
 * 흉내낼 수 없어, 성공 직후 경로를 테스트가 아예 지나가지 못했다 (codex).
 *
 * `flushSyncOnStamp` 를 켜면 표식이 붙는 순간 렌더를 강제한다 — 리캡(state)이 아직 커밋되지
 * 않은 렌더가 실제로 한 번 끼는, 지적받은 그 순서를 만든다.
 */
function syncSearchParamsWithHistory({ flushSyncOnStamp = false } = {}) {
  const nativeReplaceState = window.history.replaceState.bind(window.history);
  jest
    .spyOn(window.history, 'replaceState')
    .mockImplementation((state: unknown, unused: string, url?: string | URL | null) => {
      nativeReplaceState(state, unused, url);
      const applyToSearchParams = () => mockSetSearch(window.location.search.replace(/^\?/, ''));
      if (flushSyncOnStamp) flushSync(applyToSearchParams);
      else applyToSearchParams();
    });
}

beforeEach(() => {
  mockSearch = '';
  mockSearchListeners.clear();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  window.history.replaceState(null, '', '/planner/manage/new');
  syncSearchParamsWithHistory();
  mockSummary = DEFAULT_SUMMARY;
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

  it('표식이 리캡보다 먼저 반영되는 렌더가 껴도 완료 화면을 지킨다', async () => {
    // 표식이 붙는 순간 렌더를 강제한다 — `createdId` 는 있고 `done` 은 아직 없는 렌더를
    // 실제로 한 번 끼워 넣어, 재진입 redirect 가 여기서 발화하지 않는지 본다.
    jest.restoreAllMocks();
    syncSearchParamsWithHistory({ flushSyncOnStamp: true });
    mockCreate.mockResolvedValue({ id: 'planner-1', name: '2026 9월 모의평가' });
    mockActivate.mockResolvedValue(undefined);

    await renderContainer();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: WIZARD })); });

    // 표식이 먼저 보였다고 해서 관리 화면으로 튕기면 안 된다 — 이 마운트에서 방금 만들었다.
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: DONE_HEADING })).toBeInTheDocument();
    expect(window.location.search).toBe('?created=planner-1');
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

  it('직전 마운트에서 만들었더라도 새 마운트면 관리 화면으로 보낸다', async () => {
    // "방금 만들었다" 는 **이 마운트 한정** 사실이어야 한다. 모듈 스코프에 남겨 두면
    // 새로고침·재진입에서도 억제가 살아 빈 위저드가 다시 열리고 중복 생성이 뚫린다.
    mockCreate.mockResolvedValue({ id: 'planner-1', name: '2026 9월 모의평가' });
    mockActivate.mockResolvedValue(undefined);

    const first = await renderContainer();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: WIZARD })); });
    expect(screen.getByRole('heading', { name: DONE_HEADING })).toBeInTheDocument();
    first.unmount();

    // 표식이 붙은 URL 을 새로 여는 상황 — 리캡은 메모리에만 있었으므로 남아 있지 않다.
    await renderContainer();

    expect(screen.queryByRole('button', { name: WIZARD })).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/planner/manage');
  });
});

describe('빈 집계 — 0 을 확인 수치처럼 보여주지 않는다', () => {
  it('미리보기가 비어 있으면 블록 줄 대신 패턴 줄을 띄운다', async () => {
    // 시험일 = 오늘이면 로컬 미리보기(`generatePreview`)가 내일부터 세므로 빈 배열이 되고,
    // 집계가 `{days: 0, count: 0}` 으로 넘어온다. 그대로 옮기면 `0일 약 0개` 가 노출된다 (codex).
    mockSummary = { previewDays: 0, previewBlocks: 0, source: 'local' };
    mockCreate.mockResolvedValue({ id: 'planner-1', name: '2026 9월 모의평가' });
    mockActivate.mockResolvedValue(undefined);

    await renderContainer();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: WIZARD })); });

    expect(screen.getByRole('heading', { name: DONE_HEADING })).toBeInTheDocument();
    expect(screen.queryByText(/0일/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0개/)).not.toBeInTheDocument();
    expect(screen.getByText('블록 패턴')).toBeInTheDocument();
  });

  it('집계가 정상이면 기존대로 숫자를 보여준다', async () => {
    mockCreate.mockResolvedValue({ id: 'planner-1', name: '2026 9월 모의평가' });
    mockActivate.mockResolvedValue(undefined);

    await renderContainer();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: WIZARD })); });

    expect(screen.getByText('블록(예상)')).toBeInTheDocument();
    expect(screen.getByText(/7일 약 21개/)).toBeInTheDocument();
  });
});
