/**
 * "내일 캘린더 보기" — 실린 경로에 따라 이동 수단이 달라야 한다.
 *
 * 이 위젯은 **두 곳**에 실린다: `/planner` 일간 뷰(`views/day-view.tsx`)와
 * `/planner/reports`(`ReportsPresenter`).
 *
 * - `/planner` 안에서는 pathname 이 같고 쿼리만 바뀐다 → Next router 를 쓰면 F-01 이 재현된다
 *   (쿼리를 달고 하드 로드한 뒤 라우트 캐시의 canonicalUrl 이 다시 커밋돼 전환이 무반응).
 * - `/planner/reports` 에서는 **진짜 라우트 이동**이다 → History API 로는 화면이 안 바뀌고
 *   주소만 갈린다. router 를 써야 한다.
 *
 * 한쪽으로 통일하면 반드시 다른 쪽이 깨지므로 두 방향을 함께 고정한다.
 */
import { render, screen, fireEvent } from '@testing-library/react';

let mockPathname = '/planner';
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(''),
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

const mockPushQuery = jest.fn();
jest.mock('@/lib/planner/query-nav', () => ({
  pushQuery: (...a: unknown[]) => mockPushQuery(...a),
  replaceQuery: jest.fn(),
}));

import { TodayReflection } from '@/components/features/planner-home/components/today-reflection';

const TOMORROW = '내일 캘린더 보기';

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = '/planner';
});

describe('내일 캘린더 보기', () => {
  it('/planner 안에서는 History API — 쿼리만 바뀌는 이동이라 router 를 쓰면 죽는다(F-01)', () => {
    render(<TodayReflection defaultOpen />);
    fireEvent.click(screen.getByText(TOMORROW));
    expect(mockPushQuery).toHaveBeenCalledWith('/planner?view=month');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('/planner/reports 에서는 router — History API 로는 화면이 안 바뀐다', () => {
    mockPathname = '/planner/reports';
    render(<TodayReflection defaultOpen />);
    fireEvent.click(screen.getByText(TOMORROW));
    expect(mockPush).toHaveBeenCalledWith('/planner?view=month');
    expect(mockPushQuery).not.toHaveBeenCalled();
  });
});
