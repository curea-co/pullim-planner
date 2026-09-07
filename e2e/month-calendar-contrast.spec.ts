import { test, expect } from '@playwright/test';
import { AA_NORMAL_TEXT, measureTextContrast } from './contrast';

/**
 * 월간 캘린더 셀의 글자가 **두 명암 축 모두에서** 읽힌다.
 *
 * ── 무엇이 있었나 ───────────────────────────────────────────────────────
 * 잉크를 「미래냐」로 골랐는데, 미래여도 블록이 있으면 과거와 같은 강도로 칠해진다.
 * 그 위의 `slate-500` 은 heat-3(#5a8bff)에서 **1.60:1** — AA 4.5:1 의 3분의 1이다.
 * 같은 자리에서 「오늘」 강조(`blue-700` 2.15:1)와 블록 수(`slate-700` 3.26:1)도 무너져 있었다.
 *
 * 다크는 더 나빴다 — **60개 중 56개 미달 · 최저 1.67:1**. `--color-pullim-heat-1..5` 는
 * 고정 hex 인데 잉크로 쓰던 토큰들은 반전돼, 고정 바탕 위에서 잉크만 뒤집혔다.
 *
 * ── 왜 두 축을 다 도나 ──────────────────────────────────────────────────
 * 라이트만 검사하면 **고정 바탕 + 반전 잉크** 조합을 구조적으로 못 잡는다. 라이트에서 아무리
 * 좋아도 다크에서 뒤집히는 쪽만 움직이기 때문이다(Codex #253).
 *
 * ⚠ 명암 축은 `data-scheme` 속성을 직접 써서는 고정되지 않는다 — next-themes 가 하이드레이션에서
 * 다시 쓴다. 저장소 키(`theme`)를 먼저 심어야 실제로 그 스킴으로 뜬다. (속성만 넣고 다크를
 * 검사했다고 착각한 적이 있다 — 그때 `data-scheme` 은 계속 `light` 였다.)
 *
 * ── 왜 e2e 인가 ─────────────────────────────────────────────────────────
 * 셀 배경은 `heatColor()` 가 런타임에 정하고 토큰은 `lab()` 로 온다. jsdom 에는 Tailwind 도
 * canvas 도 없어 「클래스가 붙었는지」까지만 볼 수 있고 「그 조합이 읽히는지」는 못 본다.
 *
 * 기대값은 색이 아니라 **기준(4.5:1)** 이다 — 히트 램프가 바뀌어도 검사가 따라간다.
 */
const SCHEMES = ['light', 'dark'] as const;

for (const scheme of SCHEMES) {
  test(`월간 셀의 모든 글자가 AA 를 넘는다 — ${scheme} (종전 라이트 1.60:1 · 다크 1.67:1)`, async ({
    page,
  }) => {
    await page.addInitScript((s: string) => {
      // next-themes 저장소 키 — 속성만 심으면 하이드레이션이 덮어쓴다.
      try {
        localStorage.setItem('theme', s);
      } catch {
        /* 저장소가 막힌 컨텍스트 — 기본값(light)으로 뜬다 */
      }
    }, scheme);
    await page.goto('/planner?view=month');

    const cell = page.getByRole('button', { name: /^\d+일 · \d+개 블록/ }).first();
    await expect(cell).toBeVisible();
    // 스킴이 실제로 걸렸는지 먼저 확인한다 — 안 걸리면 light 를 두 번 검사하는 셈이 된다.
    await expect(page.locator('html')).toHaveAttribute('data-scheme', scheme);

    const samples = await measureTextContrast(page, 'button[aria-label*="개 블록"]');
    expect(samples.length).toBeGreaterThan(20); // 한 달치 셀 × 날짜/개수

    const failing = samples.filter((s) => s.ratio < AA_NORMAL_TEXT);
    expect(
      failing,
      `[${scheme}] AA ${AA_NORMAL_TEXT}:1 미달 ${failing.length}건 — ` +
        failing
          .slice(0, 5)
          .map((s) => `${s.where}「${s.text}」 ${s.ratio.toFixed(2)}:1 (${s.fg} on ${s.bg})`)
          .join(' · '),
    ).toEqual([]);
  });
}
