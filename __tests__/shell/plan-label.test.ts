import { osPlanLabel } from '@/lib/plan-label';

// QA(OS) #91 — 프로필 드롭다운 플랜 배지가 OS(pullim-web osPlanLabel)와 같은 규칙으로 나오는지.
//   OS 규약: flag 레벨 2 이상이 하나라도 있으면 '유료', 아니면 '기본'. 임계값이 어긋나면 같은 계정이
//   OS 에선 '유료', 플래너에선 '기본' 으로 보인다.
describe('osPlanLabel — 플랜 배지 라벨', () => {
  it('조회 전·실패(null/undefined)면 배지를 그리지 않는다', () => {
    // 실패를 '기본' 으로 위장하면 유료 회원에게 잘못된 등급을 단정하게 된다.
    expect(osPlanLabel(null)).toBe('');
    expect(osPlanLabel(undefined)).toBe('');
  });

  it("조회 성공·유료 없음({})은 '기본' — null 과 구분된다", () => {
    expect(osPlanLabel({})).toBe('기본');
  });

  it("모든 flag 가 1 이하면 '기본'", () => {
    expect(osPlanLabel({ planner: 1, q: 0, writing: 1 })).toBe('기본');
  });

  it("flag 하나라도 2 이상이면 '유료'", () => {
    expect(osPlanLabel({ planner: 1, q: 2 })).toBe('유료');
    expect(osPlanLabel({ planner: 3 })).toBe('유료');
  });

  it('경계값 — 2 는 유료, 1 은 기본(OS 임계값 고정)', () => {
    expect(osPlanLabel({ only: 2 })).toBe('유료');
    expect(osPlanLabel({ only: 1 })).toBe('기본');
  });
});
