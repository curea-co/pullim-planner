import { getBlockVisual, getTypeContainerClass, BLOCK_STATUS_META } from '@/lib/planner/block-type-style';
import type { BlockType, TimeBlock } from '@/lib/mock';

const STATUSES: TimeBlock['status'][] = ['todo', 'doing', 'done', 'skipped'];
const TYPES: BlockType[] = [
  'concept', 'practice', 'review', 'memorize', 'mock', 'tutor', 'self_explain', 'break',
];

/**
 * 카드와 모달이 같이 쓰는 시각 문법의 계약.
 * 여기가 갈리면 "같은 블록인데 화면마다 다른 색"이 조용히 생긴다 — 실제로 Codex #230 이
 * 잡은 회귀가 그것이었다(모달이 stripe 만 받고 상태 톤을 안 받아, skipped 블록에
 * 앰버 stripe + 파란 헤더가 나왔다).
 */
describe('block-type-style', () => {
  it('모든 타입에 아이콘 컨테이너 색이 있다', () => {
    for (const t of TYPES) {
      expect(getTypeContainerClass(t)).toMatch(/^bg-\S+ text-\S+$/);
    }
  });

  it('모든 상태에 칩 라벨·아이콘·색이 있다', () => {
    for (const s of STATUSES) {
      expect(BLOCK_STATUS_META[s].label).toBeTruthy();
      expect(BLOCK_STATUS_META[s].Icon).toBeTruthy();
      expect(BLOCK_STATUS_META[s].className).toBeTruthy();
    }
  });

  // 상태 톤은 표면마다 표현이 다르다: 카드는 면 전체(surface), 다이얼로그는 헤더(wash).
  // 둘 중 하나만 상태를 따라가면 같은 블록이 화면에 따라 다른 색으로 읽힌다.
  it('stripe 가 있는 상태는 wash 도 함께 갖는다 — 한쪽만 상태를 따라가면 톤이 갈린다', () => {
    for (const s of STATUSES) {
      const v = getBlockVisual(s, false);
      if (v.stripe) expect(v.wash).toBeTruthy();
    }
  });

  it('상태마다 서로 다른 톤을 준다 — doing·done·skipped 의 wash 가 겹치지 않는다', () => {
    const washes = (['doing', 'done', 'skipped'] as const).map(s => getBlockVisual(s, false).wash);
    expect(new Set(washes).size).toBe(washes.length);
  });

  // todo 는 기본 상태 — 카드가 무톤이면 모달도 무톤이어야 한다
  it('todo 는 stripe 도 wash 도 없다', () => {
    const v = getBlockVisual('todo', false);
    expect(v.stripe).toBeNull();
    expect(v.wash).toBeNull();
  });

  it('break 는 상태와 무관하게 회복 톤으로 고정된다', () => {
    for (const s of STATUSES) {
      expect(getBlockVisual(s, true)).toEqual(getBlockVisual('todo', true));
    }
  });
});
