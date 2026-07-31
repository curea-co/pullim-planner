import { renderHook, act } from '@testing-library/react';
import { useRailCollapse, RAIL_KEY } from '@/components/shell/use-rail-collapse';

describe('useRailCollapse', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('기본은 펼침(false), 토글하면 접히고 localStorage에 저장한다', () => {
    const { result } = renderHook(() => useRailCollapse());
    expect(result.current.collapsed).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(true);
    expect(localStorage.getItem(RAIL_KEY)).toBe('1');

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(false);
    expect(localStorage.getItem(RAIL_KEY)).toBe('0');
  });

  it("저장된 '1'을 마운트 시 복원한다", () => {
    localStorage.setItem(RAIL_KEY, '1');
    const { result } = renderHook(() => useRailCollapse());
    expect(result.current.collapsed).toBe(true);
  });
});
