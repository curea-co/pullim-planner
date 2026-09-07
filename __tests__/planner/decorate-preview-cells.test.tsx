/**
 * 꾸미기 미리보기의 **모든 셀이 반응한다.**
 *
 * `WeekGrid` 는 데모 모드에서 오늘 열만 `onNavigate` 로 보내고 나머지 요일은 스스로 toast 를
 * 띄운다(`openDay`). 미리보기는 편집 중인 선택을 잃지 않으려고 `onNavigate` 를 **no-op** 으로
 * 줬는데, 그 결과 **오늘 열만 눌러도 아무 일이 없는** 화면이 됐다 — 다른 열은 반응하니
 * 사용자는 그 한 칸을 고장으로 읽는다.
 *
 * ⚠️ **진짜 `DecorateSection` 을 렌더한다.** 여기서 핸들러를 새로 만들어 `WeekGrid` 에 직접
 * 넘기면, 정작 고친 자리가 다시 `() => {}` 로 돌아가도 테스트는 통과한다(Codex #250).
 */
import { render, screen, fireEvent } from '@testing-library/react';

const toastInfo = jest.fn();
jest.mock('sonner', () => ({
  toast: { info: (...a: unknown[]) => toastInfo(...a), success: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/planner/client', () => ({
  plannerClient: { updateCustomization: jest.fn().mockResolvedValue(undefined) },
}));

import { DecorateSection } from '@/components/features/planner-manage/components/decorate-section';
import type { Planner } from '@/lib/mock';

/** 꾸미기 미저장 = 기본값(주간 레이아웃 `matrix_by_type` → `WeekGrid`). */
const PLANNER = {
  id: 'pl_test',
  name: '테스트 시간표',
  examLabel: '9월 모평',
  active: true,
} as unknown as Planner;

/** 주간 그리드의 요일 헤더 버튼들 — `aria-label` 이 `N요일 (D일) 일간 뷰`. */
const dayCells = () => screen.getAllByLabelText(/요일 \(\d+일\) 일간 뷰$/);

beforeEach(() => jest.clearAllMocks());

describe('꾸미기 미리보기 — 침묵하는 셀이 없다', () => {
  it('주간 미리보기의 모든 요일 셀이 반응한다 — 오늘 열 포함', () => {
    render(<DecorateSection planners={[PLANNER]} initialPlannerId={PLANNER.id} />);

    fireEvent.click(screen.getByRole('tab', { name: '주간' }));

    const cells = dayCells();
    expect(cells).toHaveLength(7);
    cells.forEach((c) => fireEvent.click(c));

    // 클릭 수 = toast 수. 하나라도 적으면 그 열이 침묵한다는 뜻이다.
    // (오늘 열은 안내 toast, 나머지는 요일 요약 toast — 어느 쪽이든 반응이 있어야 한다.)
    expect(toastInfo).toHaveBeenCalledTimes(cells.length);
  });

  it('오늘 열은 홈으로 보내지 않고 이유를 말한다 — 편집 중인 선택을 잃지 않게', () => {
    render(<DecorateSection planners={[PLANNER]} initialPlannerId={PLANNER.id} />);
    fireEvent.click(screen.getByRole('tab', { name: '주간' }));

    dayCells().forEach((c) => fireEvent.click(c));

    const messages = toastInfo.mock.calls.map((c) => String(c[0]));
    expect(messages).toContain('미리보기예요');
  });
});
