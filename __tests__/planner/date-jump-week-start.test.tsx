/**
 * 날짜 점프 달력도 **월요일 시작**이다 (QA F-10).
 *
 * 이 앱의 다른 달력은 전부 월요일 시작이다 — `lib/planner/home-data` 의 `WEEKDAY_LABELS`,
 * `month-heatmap` 의 `weekHeader`. 여기만 일요일 시작이면 같은 화면에 뜬 두 달력의 열이
 * 하루씩 어긋나 보이고, 사용자는 어느 쪽이 맞는지 알 수 없다.
 *
 * 헤더만 바꾸면 **더 나쁘다** — 라벨은 월요일 시작인데 칸은 일요일 기준으로 밀려, 날짜가
 * 엉뚱한 요일 아래에 놓인다. 그래서 앞 빈 칸 계산까지 함께 본다.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { DateJumpPopover } from '@/components/features/planner-home/components/date-jump-popover';

/** 트리거(페이저 가운데 날짜 텍스트)를 눌러 월 그리드를 연다. */
const open = () => fireEvent.click(screen.getByRole('button', { name: /날짜 선택/ }));

describe('날짜 점프 달력의 주 시작', () => {
  it('요일 헤더가 월요일부터다', () => {
    render(<DateJumpPopover baseISO="2026-09-07" currentOffset={0} onPick={() => {}}>날짜 선택</DateJumpPopover>);
    open();
    const header = screen.getByText('월').parentElement!;
    expect([...header.children].map((c) => c.textContent)).toEqual(
      ['월', '화', '수', '목', '금', '토', '일'],
    );
  });

  it('날짜가 실제 요일 열에 놓인다 — 헤더만 바꾸면 하루씩 밀린다', () => {
    // 2026-09-01 은 화요일 → 월요일 시작이면 앞 빈 칸이 1개.
    render(<DateJumpPopover baseISO="2026-09-07" currentOffset={0} onPick={() => {}}>날짜 선택</DateJumpPopover>);
    open();
    const grid = screen.getByLabelText('2026년 9월 1일').parentElement!;
    const kids = [...grid.children];
    const firstDayIdx = kids.indexOf(screen.getByLabelText('2026년 9월 1일'));
    expect(firstDayIdx).toBe(1); // 월(0) 비고 화(1)에 1일

    // 일요일인 9월 6일은 마지막 열(인덱스 % 7 === 6)
    const sixth = kids.indexOf(screen.getByLabelText('2026년 9월 6일'));
    expect(sixth % 7).toBe(6);
  });
});
