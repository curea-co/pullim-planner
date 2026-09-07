import type { TimeBlock } from '@/lib/mock';

/**
 * 「다음 블록」을 고른다 — **시계를 본다.**
 *
 * ## 왜 필요한가
 *
 * 종전 `nextActiveBlock` 은 이랬다:
 *
 * ```ts
 * blocks.find(b => b.status === 'doing') ?? blocks.find(b => b.status === 'todo')
 * ```
 *
 * 시각을 **전혀 보지 않는다.** 그래서 밤 10시에 홈을 열면 아침 9시 블록이 「다음 블록 ·
 * 09:00 에 시작」으로 떠 있었다. 하루 종일 같은 카드다.
 *
 * 게다가 `'doing'` 은 **pullim-api 가 세우지 않는 상태**다(BE 는 `todo`/`done`/`skipped` 만
 * 쓴다). 첫 번째 `find` 는 실데이터에서 항상 빈손이라, 실질적으로 「그날 첫 미완료 블록」
 * 하나로 굳어 있었다. 「진행 중」은 상태가 아니라 **시각에서 파생**해야 맞다.
 *
 * ## 규칙
 *
 * | 상황 | 고르는 것 |
 * |---|---|
 * | 지금이 어떤 블록 구간 안 (`start ≤ now < end`) | 그 블록 — 진행 중 |
 * | 아니면 `start > now` 중 가장 이른 것 | 그 블록 — 다음 |
 * | 둘 다 없음(하루가 끝났다) | `undefined` — 카드를 안 보여준다 |
 *
 * 완료·건너뜀은 후보에서 빼되, **지나간 미완료 블록도 빼지 않는다** — 「다음」이라고 부르면서
 * 지나간 것을 보여주는 게 원래 결함이다. 못 한 블록은 아래 리스트에 그대로 남아 있다.
 *
 * `now` 가 `null` 이면 **시각을 보지 않는다**(오늘이 아닌 날짜 — 그날의 첫 미완료 블록).
 * 「지금」이 그 날짜 위에 있지 않은데 시계를 들이대면 뜻이 없다.
 */
export function pickNextBlock(
  blocks: readonly TimeBlock[],
  now: string | null,
): TimeBlock | undefined {
  const open = blocks.filter((b) => b.status !== 'done' && b.status !== 'skipped');
  if (now === null) return open[0];

  const ongoing = open.find((b) => b.start <= now && now < b.end);
  if (ongoing) return ongoing;

  // 배열 순서를 믿지 않는다 — 응답 정렬이 바뀌어도 「가장 이른 것」이 유지되게 직접 고른다.
  return open
    .filter((b) => b.start > now)
    .reduce<TimeBlock | undefined>((best, b) => (!best || b.start < best.start ? b : best), undefined);
}

/**
 * 지금(Asia/Seoul, 고정 UTC+9 · DST 없음)의 `HH:MM`.
 *
 * 블록의 `start`/`end` 가 `HH:MM` 문자열이라 같은 형식으로 맞춘다 — 사전순 비교가 곧 시각
 * 비교가 된다(둘 다 24시간 zero-padded).
 */
export function nowHhMmKst(at: number = Date.now()): string {
  return new Date(at + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}
