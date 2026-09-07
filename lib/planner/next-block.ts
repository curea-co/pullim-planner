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
 * `now` 가 `null` 이면 **시각을 보지 않는다**(오늘이 아닌 날짜 — 그날의 가장 이른 미완료 블록).
 * 「지금」이 그 날짜 위에 있지 않은데 시계를 들이대면 뜻이 없다.
 *
 * **어느 경로에서도 배열 순서를 믿지 않는다.** `blocksRange` 응답이 시간순이라는 보장은
 * 계약에 없다 — `open[0]` 을 쓰면 정렬이 바뀌는 순간 「첫 응답 블록」이 히어로에 뜬다.
 */
export function pickNextBlock(
  blocks: readonly TimeBlock[],
  now: string | null,
): TimeBlock | undefined {
  const open = blocks.filter((b) => b.status !== 'done' && b.status !== 'skipped');
  const earliest = (cands: readonly TimeBlock[]) =>
    cands.reduce<TimeBlock | undefined>((best, b) => (!best || b.start < best.start ? b : best), undefined);

  if (now === null) return earliest(open);

  const ongoing = open.find((b) => b.start <= now && now < b.end);
  if (ongoing) return ongoing;

  return earliest(open.filter((b) => b.start > now));
}

/**
 * 지금(Asia/Seoul, 고정 UTC+9 · DST 없음)의 날짜와 시각.
 *
 * **둘을 한 번에 낸다.** 날짜와 시각을 따로 부르면 그 사이에 자정을 넘길 수 있고, 그러면
 * 어제 날짜에 오늘 시각이 붙는다 — 하루에 한 번 나는, 재현하기 어려운 어긋남이다.
 *
 * 시각은 블록의 `start`/`end` 와 같은 `HH:MM` 형식이라 사전순 비교가 곧 시각 비교가 된다
 * (둘 다 24시간 zero-padded).
 */
export function nowKst(at: number = Date.now()): { date: string; hhmm: string } {
  const iso = new Date(at + 9 * 60 * 60 * 1000).toISOString();
  return { date: iso.slice(0, 10), hhmm: iso.slice(11, 16) };
}

/** 지금(KST)의 `HH:MM` — `nowKst().hhmm` 의 축약. */
export function nowHhMmKst(at: number = Date.now()): string {
  return nowKst(at).hhmm;
}

/**
 * 다음 **분 경계**까지 남은 ms.
 *
 * 시계 갱신을 마운트 시각 기준 `setInterval(60_000)` 으로 돌리면 경계와 어긋난다 —
 * 12:59:59 에 연 화면은 다음 갱신이 13:00:59 라, 13:00 에 시작한 블록이 있어도 **59초 동안**
 * 이전 블록을 「다음」이라 부른다. 첫 갱신만 이만큼 미룬 뒤 1분 interval 로 넘긴다.
 *
 * KST 는 UTC+9(정시 오프셋)이라 분 경계가 UTC 와 같다 — epoch 나머지를 그대로 쓸 수 있다.
 */
export function msToNextMinute(at: number = Date.now()): number {
  return 60_000 - (at % 60_000);
}
