import { render, screen } from '@testing-library/react';
import { BlockCompleteDialog } from '@/components/features/planner-home/components/block-complete-dialog';
import { getBlocksForDayOffset, blockTypeMeta, type TimeBlock } from '@/lib/mock';

/**
 * 「카드의 연장」 계약 (2026-09-02 시안 A) —
 * 모달은 색·배치를 새로 정하지 않고 리스트 행과 같은 시각 문법을 물려받는다.
 * 여기서 지키는 것은 "모달이 블록의 *상태와 타입*을 실제로 말하는가"다.
 * 재설계 전 모달은 어떤 블록을 눌러도 상태 칩이 없고 아이콘이 회색 고정이었다.
 */
function blockWith(overrides: Partial<TimeBlock>): TimeBlock {
  const base = getBlocksForDayOffset(0).find(b => b.type !== 'break');
  if (!base) throw new Error('mock 에 학습 블록이 없다 — 테스트 전제가 깨졌다');
  return { ...base, ...overrides };
}

describe('BlockCompleteDialog', () => {
  it('블록의 시간·소요·타입 라벨을 헤더에 노출한다', () => {
    const block = blockWith({ type: 'practice', status: 'doing' });
    render(<BlockCompleteDialog block={block} onClose={() => {}} />);

    expect(screen.getByText(`${block.start}–${block.end}`)).toBeInTheDocument();
    expect(screen.getByText(`${block.expectedMinutes}분`)).toBeInTheDocument();
    expect(screen.getByText(blockTypeMeta.practice.label)).toBeInTheDocument();
  });

  // 상태별 칩 — 리스트 행과 같은 BLOCK_STATUS_META 를 쓰므로 상태가 바뀌면 문구도 따라온다
  it.each([
    ['doing', '진행'],
    ['skipped', '이월'],
  ] as const)('%s 블록이면 상태 칩에 "%s"를 보여준다', (status, label) => {
    render(<BlockCompleteDialog block={blockWith({ status })} onClose={() => {}} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  // '대기'는 기본 상태라 무표시 — 칩을 띄우면 모든 블록에 칩이 붙어 신호가 죽는다 (07-10 QA)
  it('todo 블록이면 상태 칩을 띄우지 않는다', () => {
    render(<BlockCompleteDialog block={blockWith({ status: 'todo' })} onClose={() => {}} />);
    expect(screen.queryByText('대기')).not.toBeInTheDocument();
  });

  it('감정 5단을 radiogroup 으로 노출하고 기본은 아무것도 선택되지 않는다', () => {
    render(<BlockCompleteDialog block={blockWith({})} onClose={() => {}} />);
    const options = screen.getAllByRole('radio');
    expect(options).toHaveLength(5);
    expect(options.every(o => o.getAttribute('aria-checked') === 'false')).toBe(true);
  });

  // CTA 는 정확히 둘 (QA #12 — 종료/5분 휴식/다음 블록 시작 제거)
  it('CTA 는 닫기·완료 둘뿐이다', () => {
    render(<BlockCompleteDialog block={blockWith({})} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '완료' })).toBeInTheDocument();
  });

  it('block 이 null 이면 내용을 렌더하지 않는다', () => {
    render(<BlockCompleteDialog block={null} onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: '완료' })).not.toBeInTheDocument();
  });

  /**
   * 실데이터 방어 — `lib/planner/home-data.ts` 는 pullim-api JSON 을 검증 없이 단언한다
   * (`b.engines as PedagogyEngineId[]`, `b.status as …`). BE 가 값을 빠뜨리면 런타임에는
   * undefined 다. 홈 리스트가 쓰는 compact 카드는 engines 를 안 만져서 멀쩡한데 모달만
   * 죽으면 "리스트는 되는데 팝업만 안 열린다"가 된다 — 실제로 그렇게 깨졌다.
   */
  describe('실데이터에 필드가 빠져도 죽지 않는다', () => {
    it('engines 가 없어도 렌더된다', () => {
      const block: Partial<TimeBlock> = blockWith({});
      delete block.engines;
      expect(() =>
        render(<BlockCompleteDialog block={block as TimeBlock} onClose={() => {}} />),
      ).not.toThrow();
    });

    it('모르는 status 여도 렌더되고 상태 칩만 접힌다', () => {
      const block = { ...blockWith({}), status: 'in_progress' as TimeBlock['status'] };
      expect(() => render(<BlockCompleteDialog block={block} onClose={() => {}} />)).not.toThrow();
      expect(screen.getByRole('button', { name: '완료' })).toBeInTheDocument();
    });

    it('progress 가 없어도 진행 바가 NaN% 를 보이지 않는다', () => {
      const block: Partial<TimeBlock> = blockWith({ status: 'doing' });
      delete block.progress;
      render(<BlockCompleteDialog block={block as TimeBlock} onClose={() => {}} />);
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    });
  });
});
