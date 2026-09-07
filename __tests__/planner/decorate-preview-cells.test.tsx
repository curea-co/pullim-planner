/**
 * 꾸미기 미리보기의 **모든 셀이 반응한다.**
 *
 * `WeekGrid` 는 데모 모드에서 오늘 열만 `onNavigate` 로 보내고 나머지 요일은 스스로 toast 를
 * 띄운다(`openDay`). 미리보기는 편집 중인 선택을 잃지 않으려고 `onNavigate` 를 **no-op** 으로
 * 줬는데, 그 결과 **오늘 열만 눌러도 아무 일이 없는** 화면이 됐다 — 다른 열은 반응하니
 * 사용자는 고장으로 읽는다.
 *
 * 위젯은 그대로 두고(빌려오는 쪽이 동작을 바꾸지 않는다는 cross-feature 규칙) 컨테이너가
 * 「이동 대신 이유를 말하는」 핸들러를 준다. 이 파일은 그 계약을 고정한다.
 */
import { render, screen, fireEvent } from '@testing-library/react';

const toastInfo = jest.fn();
jest.mock('sonner', () => ({ toast: { info: (...a: unknown[]) => toastInfo(...a) } }));

import { WeekGrid } from '@/components/features/planner-home/components/week-grid';

beforeEach(() => jest.clearAllMocks());

describe('데모 주간 그리드 — 어느 셀을 눌러도 반응이 있다', () => {
  it('오늘 열은 onNavigate 로, 나머지 요일은 toast 로 반응한다', () => {
    const onNavigate = jest.fn();
    render(<WeekGrid onNavigate={onNavigate} />);

    const cells = screen.getAllByRole('button');
    expect(cells.length).toBeGreaterThan(0);
    cells.forEach((c) => fireEvent.click(c));

    // 두 경로 다 실제로 불린다 — 어느 한쪽이라도 0이면 그 열은 무반응이라는 뜻이다.
    expect(onNavigate).toHaveBeenCalled();
    expect(toastInfo).toHaveBeenCalled();
    expect(onNavigate.mock.calls.length + toastInfo.mock.calls.length).toBe(cells.length);
  });

  it('미리보기가 주는 핸들러는 이동 대신 이유를 말한다 — no-op 이면 오늘 열이 죽는다', () => {
    // decorate-section 이 넘기는 것과 같은 모양의 핸들러.
    const previewNavigate = () =>
      toastInfo('미리보기예요', { description: '꾸미기를 저장하면 홈에서 실제 시간표로 볼 수 있어요.' });
    render(<WeekGrid onNavigate={previewNavigate} />);

    const cells = screen.getAllByRole('button');
    cells.forEach((c) => fireEvent.click(c));

    // 클릭 수 = toast 수. 침묵하는 셀이 하나도 없다.
    expect(toastInfo).toHaveBeenCalledTimes(cells.length);
  });
});
