import type { Page } from '@playwright/test';

/**
 * 대비 측정 — **칠해서 픽셀을 읽는다.**
 *
 * 토큰이 `lab()`·`color-mix()` 로 오므로 `getComputedStyle` 문자열을 파싱하면 값이 틀린다
 * (문자열을 RGB 로 오해해 15.11:1 이라는 엉뚱한 값을 얻은 적이 있다). canvas 에 실제로 칠하고,
 * 반투명은 조상 배경 위에 얹어 실효색을 만든다.
 *
 * jsdom(Jest)에는 Tailwind 도 canvas 도 없어 이 검사는 실브라우저에서만 가능하다.
 */
export type TextSample = { where: string; text: string; bg: string; fg: string; ratio: number };

/** `selector` 에 걸리는 요소들 안의 **모든 텍스트 조각**을 배경 대비와 함께 돌려준다. */
export function measureTextContrast(page: Page, selector: string): Promise<TextSample[]> {
  return page.evaluate((sel: string) => {
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
    /** 조상을 거슬러 올라가 처음 만나는 불투명 배경 — 반투명 위젯의 실효 배경. */
    const backdrop = (el: Element): string => {
      for (let n: Element | null = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
      }
      return '#ffffff';
    };

    const out: { where: string; text: string; bg: string; fg: string; ratio: number }[] = [];
    for (const host of document.querySelectorAll(sel)) {
      const where = host.getAttribute('aria-label') || host.textContent?.trim().slice(0, 30) || '(무명)';
      const bg = paint(backdrop(host), '#ffffff');
      for (const node of host.querySelectorAll('*')) {
        const direct = [...node.childNodes].some(
          (n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '',
        );
        if (!direct) continue;
        const cs = getComputedStyle(node);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const fg = paint(cs.color, hex(bg));
        const [hi, lo] = lum(bg) > lum(fg) ? [lum(bg), lum(fg)] : [lum(fg), lum(bg)];
        out.push({
          where,
          text: (node.textContent ?? '').trim().slice(0, 12),
          bg: hex(bg),
          fg: hex(fg),
          ratio: (hi + 0.05) / (lo + 0.05),
        });
      }
    }
    return out;
  }, selector);
}

/** WCAG 2.2 AA — 일반 텍스트. 굵은 14px 은 large text 가 아니다(18.66px 이상이어야 한다). */
export const AA_NORMAL_TEXT = 4.5;
