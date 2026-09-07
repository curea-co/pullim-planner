/**
 * 재사용 위젯의 이동은 **컨테이너가 정한다** — 위젯은 목적지만 알린다.
 *
 * `MonthHeatmap` 과 `TodayReflection` 은 `/planner`(홈)와 `/planner/reports` 양쪽에 실린다.
 * 두 경로에서 필요한 이동 수단이 **반대**다:
 *
 * - `/planner` — pathname 이 같고 쿼리만 바뀐다. Next router 를 쓰면 쿼리를 달고 하드 로드한
 *   뒤 라우트 캐시의 canonicalUrl 이 다시 커밋돼 **전환이 무반응**이 된다(F-01).
 * - `/planner/reports` — 진짜 라우트 이동이다. History API 는 URL 만 바꾸므로 화면은 리포트에
 *   남고 **주소만 갈린다.**
 *
 * 그래서 위젯을 어느 한쪽으로 통일하면 반드시 다른 쪽이 깨진다. 위젯은 `onNavigate` 로
 * 목적지만 넘기고, 라우트를 아는 컨테이너가 수단을 고른다(feature `components/` 의 라우팅 훅
 * 금지 규칙과도 맞는다). 이 파일은 그 계약과 양쪽 배선을 함께 고정한다.
 *
 * ⚠️ **"리포트는 router" 는 위젯이 주는 목적지(`/planner`)에 대한 말이다.** 리포트가 자기
 * 화면 안에서 `?view=` 만 토글하는 것은 정반대로 **History API** 여야 한다 — 홈과 같은 모양의
 * 자리이고 같은 F-01 을 문다. 두 축을 아래 describe 두 개로 나눠 고정한다.
 */
import { render, screen, fireEvent, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/planner',
  useSearchParams: () => new URLSearchParams(''),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() },
}));

// ReportsContainer 가 무는 ESM 패키지 — jest transform 대상이 아니라 파싱에서 막힌다.
jest.mock('@vercel/analytics', () => ({ track: jest.fn() }));

const mockPushQuery = jest.fn();
const mockReplaceQuery = jest.fn();
jest.mock('@/lib/planner/query-nav', () => ({
  pushQuery: (...a: unknown[]) => mockPushQuery(...a),
  replaceQuery: (...a: unknown[]) => mockReplaceQuery(...a),
}));

/**
 * HomeContainer 가 무는 실 API 클라이언트 — 배선만 보므로 **비어 있지만 계약에 맞는** 응답을
 * 준다. `null` 로 뭉개면 컨테이너가 `res.level`·`res.available` 을 읽다 던지고, 그 예외를
 * `.catch(() => {})` 가 삼켜서 **테스트는 통과하는데 실제로는 실패 경로만 타게 된다**(Codex #247).
 */
jest.mock('@/lib/planner/pullim-client', () => ({
  pullimPlannerClient: {
    list: () => Promise.resolve([]),
    blocksRange: () => Promise.resolve([]),
    burnout: () => Promise.resolve({ available: false }),
    condition: () => Promise.resolve({ date: '2026-09-07', level: null }),
    saveCondition: () => Promise.resolve({ date: '2026-09-07', level: 3 }),
    completeBlock: () => Promise.resolve(undefined),
  },
  pullimToPlanner: (p: unknown) => p,
}));

// 컨테이너 배선만 보면 되므로 프리젠터는 주입받은 핸들러를 노출하는 버튼으로 대체한다.
let capturedNavigate: ((url: string) => void) | null = null;
jest.mock('@/components/features/planner-reports/presenters/ReportsPresenter', () => ({
  __esModule: true,
  default: (props: { onNavigate: (url: string) => void; onChangeView: (v: string) => void }) => {
    capturedNavigate = props.onNavigate;
    return (
      <>
        <button type="button" onClick={() => props.onNavigate('/planner?view=day')}>이동(테스트)</button>
        <button type="button" onClick={() => props.onChangeView('month')}>뷰전환(테스트)</button>
      </>
    );
  },
}));

jest.mock('@/components/features/planner-home/presenters/HomePresenter', () => ({
  __esModule: true,
  default: (props: { onNavigate: (url: string) => void; onChangeView: (v: string) => void }) => (
    <>
      <button type="button" onClick={() => props.onNavigate('/planner?view=day&d=3')}>홈이동(테스트)</button>
      <button type="button" onClick={() => props.onChangeView('month')}>홈뷰전환(테스트)</button>
    </>
  ),
}));

import { TodayReflection } from '@/components/features/planner-home/components/today-reflection';
import { MonthHeatmap } from '@/components/features/planner-home/components/month-heatmap';
import { WeekGrid } from '@/components/features/planner-home/components/week-grid';
import ReportsContainer from '@/components/features/planner-reports/containers/ReportsContainer';
import HomeContainer from '@/components/features/planner-home/containers/HomeContainer';

beforeEach(() => jest.clearAllMocks());

describe('위젯 계약 — 목적지만 알린다', () => {
  it('회고의 "내일 캘린더 보기" 는 onNavigate 로만 이동한다', () => {
    const onNavigate = jest.fn();
    render(<TodayReflection defaultOpen onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('내일 캘린더 보기'));
    expect(onNavigate).toHaveBeenCalledWith('/planner?view=month');
    // 위젯이 스스로 이동하지 않는다 — 어느 수단도 직접 부르지 않는다
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockPushQuery).not.toHaveBeenCalled();
  });

  it('주간 그리드도 마찬가지다 — 꾸미기 미리보기에서 홈으로 튀지 않게', () => {
    const onNavigate = jest.fn();
    render(<WeekGrid onNavigate={onNavigate} />);
    // 데모 모드 — 오늘 열만 이동하고 나머지는 toast
    const cells = screen.getAllByRole('button');
    cells.forEach((c) => fireEvent.click(c));
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockPushQuery).not.toHaveBeenCalled();
  });

  it('월간 히트맵의 셀 클릭도 onNavigate 로만 이동한다', () => {
    const onNavigate = jest.fn();
    render(<MonthHeatmap onNavigate={onNavigate} />);
    // 데모 모드(days 미주입) — 과거·오늘 셀은 일간 뷰로 보낸다
    const cell = screen.getAllByRole('button').find((b) => !b.textContent?.includes('예정'));
    fireEvent.click(cell!);
    expect(onNavigate).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockPushQuery).not.toHaveBeenCalled();
  });
});

describe('컨테이너 배선 — 경로마다 수단이 다르다', () => {
  it('리포트의 위젯 이동은 router 다 — History API 면 화면이 안 바뀐다', async () => {
    await act(async () => { render(<ReportsContainer />); });
    fireEvent.click(screen.getByText('이동(테스트)'));
    expect(mockPush).toHaveBeenCalledWith('/planner?view=day');
    expect(mockPushQuery).not.toHaveBeenCalled();
    expect(capturedNavigate).not.toBeNull();
  });

  it('홈의 위젯 이동은 History API 다 — router 면 하드 로드 뒤 무반응이 된다(F-01)', async () => {
    await act(async () => { render(<HomeContainer />); });
    fireEvent.click(screen.getByText('홈이동(테스트)'));
    expect(mockPushQuery).toHaveBeenCalledWith('/planner?view=day&d=3');
    expect(mockPush).not.toHaveBeenCalled();
  });
});

/**
 * **같은 경로 안의 뷰 토글**도 같은 규칙이다. 위 describe 가 고정하는 것은 "위젯이 주는 목적지"의
 * 이동 수단이고, 여기서 고정하는 것은 컨테이너 자신의 쿼리 전환이다. 리포트는 홈과 같은 모양의
 * 자리를 갖고 있으면서 오래 router 로 남아 있었다 — F-01 이 홈에서만 보였기 때문이다.
 */
describe('뷰 토글 — 쿼리만 바뀌면 History API', () => {
  it('리포트 뷰 토글은 replaceQuery 다 — router.replace 면 F-01 을 그대로 물려받는다', async () => {
    await act(async () => { render(<ReportsContainer />); });
    fireEvent.click(screen.getByText('뷰전환(테스트)'));
    expect(mockReplaceQuery).toHaveBeenCalledWith('/planner/reports?view=month');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('홈 뷰 토글도 replaceQuery 다', async () => {
    await act(async () => { render(<HomeContainer />); });
    fireEvent.click(screen.getByText('홈뷰전환(테스트)'));
    expect(mockReplaceQuery).toHaveBeenCalledWith('/planner?view=month');
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
