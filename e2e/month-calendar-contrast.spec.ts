import { test, expect } from '@playwright/test';
import { AA_NORMAL_TEXT, measureTextContrast } from './contrast';

/**
 * 월간 캘린더 셀의 글자가 **바탕 위에서 읽힌다.**
 *
 * ── 무엇이 있었나 ───────────────────────────────────────────────────────
 * 잉크를 「미래냐」로 골랐는데, 미래여도 블록이 있으면 과거와 같은 강도로 칠해진다.
 * 그 위의 `slate-500` 은 heat-3(#5a8bff)에서 **1.60:1** — AA 4.5:1 의 3분의 1이다.
 * 같은 자리에서 「오늘」 강조(`blue-700` 2.15:1)와 블록 수(`slate-700` 3.26:1)도 무너져 있었다.
 *
 * ── 왜 e2e 인가 ─────────────────────────────────────────────────────────
 * 셀 배경은 `heatColor()` 가 런타임에 정하고 토큰은 `lab()` 로 온다. jsdom 에는 Tailwind 도
 * canvas 도 없어 「클래스가 붙었는지」까지만 볼 수 있고 「그 조합이 읽히는지」는 못 본다.
 *
 * 기대값은 색이 아니라 **기준(4.5:1)** 이다 — 히트 램프가 바뀌어도 검사가 따라간다.
 */
const SCHEME_PINNED = 'light';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((scheme: string) => {
    document.documentElement.setAttribute('data-scheme', scheme);
  }, SCHEME_PINNED);
});

test('월간 셀의 모든 글자가 AA 를 넘는다 — 종전 1.60:1', async ({ page }) => {
  await page.goto('/planner?view=month');
  // 셀은 `N일 · M개 블록 · 완료 P%` 를 aria-label 로 갖는다.
  const cell = page.getByRole('button', { name: /^\d+일 · \d+개 블록/ }).first();
  await expect(cell).toBeVisible();

  const samples = await measureTextContrast(page, 'button[aria-label*="개 블록"]');
  expect(samples.length).toBeGreaterThan(20); // 한 달치 셀 × 날짜/개수

  const failing = samples.filter((s) => s.ratio < AA_NORMAL_TEXT);
  expect(
    failing,
    `AA ${AA_NORMAL_TEXT}:1 미달 ${failing.length}건 — ` +
      failing
        .slice(0, 5)
        .map((s) => `${s.where}「${s.text}」 ${s.ratio.toFixed(2)}:1 (${s.fg} on ${s.bg})`)
        .join(' · '),
  ).toEqual([]);
});
