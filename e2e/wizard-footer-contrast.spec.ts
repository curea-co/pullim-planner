import { test, expect, type Page } from '@playwright/test';

/**
 * 위저드 푸터 [다음] 의 **실제 대비** — jsdom 으로는 볼 수 없는 결함.
 *
 * ── 무엇이 있었나 ───────────────────────────────────────────────────────
 * 첫 단계에서 [다음] 은 아직 못 넘어가는 상태로 뜬다. 그 상태의 클래스가
 * `bg-pullim-slate-300 text-white` 였고, 실측 대비가 **1.48:1**(#ffffff on #d4d4d8)이었다 —
 * WCAG AA 4.5:1 의 3분의 1이다. 게다가 `disabled` 도 아니어서(누르면 막힌 이유를 toast 로
 * 알려준다) **대비 예외에도 해당하지 않는다.** 글자가 사실상 안 보이는 채로 나가 있었다.
 *
 * ── 왜 e2e 인가 ─────────────────────────────────────────────────────────
 * Jest(jsdom)는 Tailwind 를 컴파일하지 않아 **클래스가 붙었는지**만 볼 수 있고
 * **그 클래스가 어떤 색이 되는지**는 볼 수 없다. 토큰이 `lab()`·`color-mix()` 로 오는 것도
 * 문자열 파싱으로는 못 푼다 — 그래서 아래는 canvas 에 **실제로 칠해 sRGB 픽셀을 읽는다.**
 * (문자열을 RGB 로 오해해 15.11:1 이라는 엉뚱한 값을 얻은 적이 있다.)
 *
 * ── 값을 하드코딩하지 않는다 ────────────────────────────────────────────
 * 기대값은 색이 아니라 **기준(4.5:1)** 이다. 토큰이 바뀌어도 검사는 따라간다.
 */

/** 명암 축 고정 — 같은 이유로 기존 스펙도 라이트로 고정한다(`planner-theme-and-elevation`). */
const SCHEME_PINNED = 'light';

/** WCAG 2.2 AA — 일반 텍스트 본문 대비. 굵은 14px 은 large text 가 아니다(18.66px 이상이어야 한다). */
const AA_NORMAL_TEXT = 4.5;

/**
 * 요소의 전경/배경을 **칠해서** 읽고 대비를 낸다.
 *
 * 배경이 반투명일 수 있으므로(다크의 `color-mix(… , transparent)`) 조상 배경 위에 얹어
 * 실효색을 만든다. `getComputedStyle` 문자열을 그대로 파싱하지 않는 이유는 위 주석 참고.
 */
function contrastOf(page: Page, selectorText: string): Promise<{ ratio: number; bg: string; fg: string }> {
  return page.evaluate((label: string) => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim().startsWith(label),
    );
    if (!btn) throw new Error(`버튼을 찾지 못했다: ${label}`);

    // 조상을 거슬러 올라가 처음 만나는 불투명 배경 — 반투명 위젯의 실효 배경이 된다.
    const backdrop = (el: Element): string => {
      for (let n: Element | null = el.parentElement; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
      }
      return '#ffffff';
    };
    const paint = (css: string, under: string): [number, number, number] => {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      const x = c.getContext('2d')!;
      x.fillStyle = under;
      x.fillRect(0, 0, 1, 1);
      x.fillStyle = css;
      x.fillRect(0, 0, 1, 1);
      const d = x.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    const hex = (p: number[]) => '#' + p.map((v) => v.toString(16).padStart(2, '0')).join('');
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };

    const cs = getComputedStyle(btn);
    const bgPx = paint(cs.backgroundColor, hex(paint(backdrop(btn), '#ffffff')));
    const fgPx = paint(cs.color, hex(bgPx));
    const [hi, lo] = lum(bgPx) > lum(fgPx) ? [lum(bgPx), lum(fgPx)] : [lum(fgPx), lum(bgPx)];
    return { ratio: (hi + 0.05) / (lo + 0.05), bg: hex(bgPx), fg: hex(fgPx) };
  }, selectorText);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((scheme: string) => {
    // 명암 축을 미리 박아 둔다 — SchemeProvider 가 붙기 전 첫 페인트부터 고정된다.
    document.documentElement.setAttribute('data-scheme', scheme);
  }, SCHEME_PINNED);
});

test('막힌 [다음] 도 글자가 읽힌다 — 종전 1.48:1', async ({ page }) => {
  await page.goto('/planner/manage/new');
  // 첫 단계는 입력 전이라 blockedReason 이 서 있다 = 막힌 상태의 [다음].
  await expect(page.getByRole('button', { name: /^다음/ })).toBeVisible();

  const { ratio, bg, fg } = await contrastOf(page, '다음');
  expect(
    ratio,
    `막힌 [다음] 대비 ${ratio.toFixed(2)}:1 (배경 ${bg} · 글자 ${fg}) — AA ${AA_NORMAL_TEXT}:1 미달`,
  ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
});
