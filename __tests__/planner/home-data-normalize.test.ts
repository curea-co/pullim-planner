import { pullimToTimeBlock } from '@/lib/planner/home-data';
import type { PullimBlock } from '@/lib/api-client';

/**
 * `PullimBlock` 은 계약상 subject·type·status 가 `string`, engines 가 `string[]` 이다
 * (lib/api-client/pullim-planner.ts). FE 는 이것을 닫힌 enum 으로 보고 곳곳에서
 * `Record<BlockType, …>` 로 조회하므로, 모르는 값이 그대로 통과하면 조회가 undefined 가
 * 되고 `meta.Icon` 에서 페이지가 죽는다. 경계에서 접는 것이 이 테스트의 대상이다.
 */
function raw(over: Partial<PullimBlock> = {}): PullimBlock {
  return {
    id: 'b1', start: '14:00', end: '14:50',
    subject: 'math', type: 'practice', title: '테스트 블록',
    engines: ['spaced_repetition'], progress: 0.5, status: 'doing',
    expectedMinutes: 50, completed: false,
    ...over,
  } as PullimBlock;
}

describe('pullimToTimeBlock — BE 값 정규화', () => {
  beforeEach(() => { jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('아는 값은 그대로 통과시킨다', () => {
    const b = pullimToTimeBlock(raw());
    expect(b.type).toBe('practice');
    expect(b.subject).toBe('math');
    expect(b.status).toBe('doing');
    expect(b.engines).toEqual(['spaced_repetition']);
  });

  it('모르는 type 은 안전한 기본값으로 접는다', () => {
    expect(pullimToTimeBlock(raw({ type: 'flashcard' })).type).toBe('concept');
  });

  it('모르는 subject 는 etc 로 접는다', () => {
    expect(pullimToTimeBlock(raw({ subject: 'philosophy' })).subject).toBe('etc');
  });

  it('모르는 status 는 todo 로 접는다', () => {
    expect(pullimToTimeBlock(raw({ status: 'in_progress' })).status).toBe('todo');
  });

  it('모르는 엔진만 골라 버리고 아는 것은 남긴다', () => {
    const b = pullimToTimeBlock(raw({ engines: ['leitner_box', 'pomodoro', 'nope'] }));
    expect(b.engines).toEqual(['pomodoro']);
  });

  it('engines 가 아예 없어도 빈 배열이 된다', () => {
    expect(pullimToTimeBlock(raw({ engines: undefined as unknown as string[] })).engines).toEqual([]);
  });

  it('모르는 값을 조용히 삼키지 않는다 — 경고를 남긴다', () => {
    pullimToTimeBlock(raw({ type: 'brand_new_type' }));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('brand_new_type'));
  });

  it('완료 기록이 있으면 status 가 done 으로 보정된다', () => {
    expect(pullimToTimeBlock(raw({ completed: true, status: 'todo' })).status).toBe('done');
  });
});
