import { test, expect, type Page } from '@playwright/test';

/**
 * 테마 축과 elevation — **실브라우저가 아니면 확인할 수 없는 것들.**
 *
 * ── 이 스펙이 겨냥하는 자리 ─────────────────────────────────────────────
 * #218「컴파일되지 않던 유틸리티 3종을 되살린다」의 검증란은 이렇게 끝난다:
 *
 *   > 브라우저로는 보지 못했다. 아래 「화면 영향」은 컴파일 산출물에서 추론한 것이다.
 *
 * 그 PR 이 고친 세 결함은 전부 「유효한 CSS 인데 아무것도 매치하지 않는다」 형태라
 * 타입·린트·Jest 어디에도 걸리지 않았다. jsdom 에는 Tailwind 가 없어서 **클래스가
 * 붙었는지**는 볼 수 있어도 **그 클래스가 값을 갖는지**는 볼 수 없다. 그래서 아래 셋은
 * 전부 `getComputedStyle` 로 **해석된 값**을 본다.
 *
 * ── 무엇을 지키는가 ─────────────────────────────────────────────────────
 *  §1 성격 축 `data-theme` 이 실제로 DOM 에 붙는다 (+ 명암 축 `data-scheme`)
 *  §2 `[data-theme]` 스코프 토큰 23 개가 값을 갖는다 — 그리고 `data-theme` 이
 *     사라져도 `:where(:root)` 폴백이 **같은 값**을 유지한다
 *  §3 `:where(:root)` 가 테마를 **덮지 않는다** — pullim-jr 로 바꾸면 jr 값이 나온다
 *  §4 `shadow-pullim-*` 유틸리티가 실제 box-shadow 를 그린다 (#218 A, 사용처 25 곳)
 *  §5 `bg-pullim-*` 이 실제로 칠해진다 — 빈 `var()` 는 조용히 투명이 된다
 *
 * ── 값을 하드코딩하지 않는다 ────────────────────────────────────────────
 * 기대값은 **런타임에 토큰을 읽어** 만든다(classbot `color-palette.spec.ts` 의
 * `readBotSignatureRgb` 와 같은 취지). 토큰 값이 바뀌면 검사도 같이 따라가고,
 * 「토큰은 바뀌었는데 기준만 옛 값에 남아 1 차이로 빠져나가는」 사고를 막는다.
 */

/**
 * `app/tokens/pullim-{os,jr}.css` 의 `[data-theme=…]` 블록에만 있고 벤더링
 * `_base.css` 의 `:root` 에는 없는 토큰들 — 즉 `<html data-theme>` 한 줄이 유일한
 * 방어선이던 것들. `app/globals.css` 의 `:where(:root)` 폴백 블록과 1:1 이다.
 * (그 줄이 사라지면 약 543 개 유틸리티 인스턴스가 값을 잃는다 — #218 C)
 */
const THEME_SCOPED_TOKENS = [
  '--color-primary-50',
  '--color-primary-100',
  '--color-primary-200',
  '--color-primary-300',
  '--color-primary-400',
  '--color-primary-500',
  '--color-primary-600',
  '--color-primary-700',
  '--color-primary-800',
  '--color-primary-900',
  '--color-primary-950',
  '--color-action-primary',
  '--color-action-primary-hover',
  '--color-action-primary-fg',
  '--color-action-secondary',
  '--color-action-secondary-fg',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-xl',
  '--font-weight-body',
  '--font-weight-h',
  '--font-display',
] as const;

/**
 * 「빈 값」보다 나쁜 게 「대체」다 — `--shadow-sm/md/lg` 는 Tailwind 기본 테마에 같은
 * 이름이 있어서, 폴백이 없으면 값을 잃는 대신 **그럴듯한 다른 그림자로 조용히 바뀐다**
 * (#218 C 실측: `0 1px 2px rgba(13,26,31,.06)` → `0 1px 3px 0 rgb(0 0 0/.1)`).
 * 그래서 §2 는 「비어 있지 않다」가 아니라 「**값이 같다**」로 본다.
 */
const ELEVATION_TOKENS = ['--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl'] as const;

/** 검사할 화면. `/planner`(홈)와 `/planner/manage`(시간표 관리) — 둘이 서로 다른 elevation 단계를 쓴다. */
const ROUTES = ['/planner', '/planner/manage'] as const;

/** `<html>` 에서 해석된 커스텀 프로퍼티 값을 읽는다. */
function readRootTokens(page: Page, names: readonly string[]): Promise<Record<string, string>> {
  return page.evaluate((ns: string[]) => {
    const cs = getComputedStyle(document.documentElement);
    return Object.fromEntries(ns.map((n) => [n, cs.getPropertyValue(n).trim()]));
  }, names as string[]);
}

/**
 * ⚠ **명암 축을 고정해야 §2·§3 의 전제가 성립한다.**
 *
 * `:where(:root)` 폴백은 **pullim-os 라이트 값 한 벌**이다(globals.css 가 「다크 블록에서
 * 가져오지 말 것」이라고 못 박는다). 그런데 다크 정의의 선택자는
 * `[data-theme="pullim-os"][data-scheme="dark"]` 로 **`data-theme` 을 요구한다.**
 * 그래서 다크 상태에서 `data-theme` 을 떼면 다크 그림자 → 라이트 폴백으로 **정상적으로**
 * 값이 바뀐다. §2 의 「값이 같다」는 라이트에서만 성립하는 불변식이다.
 *
 * §3 도 같다 — os 와 jr 의 **다크** elevation 은 네 단계가 **완전히 같은 값**이다
 * (`0 1px 2px rgba(0,0,0,.45)` …). 다크에서 비교하면 「폴백이 테마를 덮는다」와
 * 「원래 같다」를 구별할 수 없다.
 *
 * 지금은 `SchemeProvider` 의 `defaultTheme="light"` 덕에 사실상 항상 라이트로 뜨지만,
 * 그건 **우연히 성립하는 전제**다. 여기서 명시로 고정해 둔다 — 앱 기본값이 바뀌어도
 * 이 검사가 엉뚱한 이유로 빨개지지 않는다. (Codex 리뷰 #226)
 */
const SCHEME_PINNED = 'light';

/**
 * `data-theme` 을 잠시 바꿔(명암 축은 `SCHEME_PINNED` 로 고정) 토큰을 읽고 **원래대로 되돌린다.**
 * 되돌리기를 evaluate 안에서 같이 하는 이유: 중간에 실패해도 페이지가 남지 않도록
 * (각 테스트가 새 page 를 받지만, 한 테스트 안에서 이어 읽는 단언이 오염되지 않게).
 */
function readTokensUnderTheme(
  page: Page,
  theme: string | null,
  names: readonly string[],
): Promise<Record<string, string>> {
  return page.evaluate(
    ({ theme, scheme, ns }: { theme: string | null; scheme: string; ns: string[] }) => {
      const html = document.documentElement;
      const originalTheme = html.getAttribute('data-theme');
      const originalScheme = html.getAttribute('data-scheme');

      if (theme === null) html.removeAttribute('data-theme');
      else html.setAttribute('data-theme', theme);
      html.setAttribute('data-scheme', scheme);

      const cs = getComputedStyle(html);
      const out = Object.fromEntries(ns.map((n) => [n, cs.getPropertyValue(n).trim()]));

      if (originalTheme === null) html.removeAttribute('data-theme');
      else html.setAttribute('data-theme', originalTheme);
      if (originalScheme === null) html.removeAttribute('data-scheme');
      else html.setAttribute('data-scheme', originalScheme);
      return out;
    },
    { theme, scheme: SCHEME_PINNED, ns: names as string[] },
  );
}

/**
 * 페이지를 열고 **화면이 실제로 렌더될 때까지** 기다린다.
 *
 * `data-scheme`(next-themes 가 마운트 후 붙인다)만 기다리면 하이드레이션까지만 보장되고
 * 본문은 아직일 수 있다 — 그 상태로 DOM 을 훑으면 §4·§5 가 「대상 소실」로 간헐 실패한다.
 * `<main>` 은 `RequireAuth` 를 통과한 `AppShell` 안에만 있으므로, 이게 보이면 인증 게이트를
 * 넘어 셸이 그려졌다는 뜻이다. (Codex 리뷰 #226 3 차)
 */
async function open(page: Page, route: string): Promise<void> {
  await page.goto(route, { waitUntil: 'networkidle' });
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-scheme', /^(light|dark)$/);
}

/**
 * 검사 대상이 DOM 에 붙을 때까지 기다린다 — 비동기로 그려지는 표면 대비.
 *
 * **타임아웃은 삼킨다.** 끝내 안 붙는 것이 정상 상태인지(회귀) 늦은 것인지는 여기서 판정하지
 * 않고, 호출부의 「대상 소실」 단언이 말하게 둔다 — Playwright 타임아웃 메시지보다 그쪽이
 * 무엇이 사라졌는지 분명하다.
 */
async function settle(page: Page, selector: string): Promise<void> {
  await page
    .locator(selector)
    .first()
    .waitFor({ state: 'attached', timeout: 10_000 })
    .catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────
// §1 두 축이 실제로 DOM 에 붙는다
// ─────────────────────────────────────────────────────────────────────────

test('§1 성격 축 data-theme 과 명암 축 data-scheme 이 <html> 에 함께 붙는다', async ({ page }) => {
  await open(page, '/planner');
  const html = page.locator('html');

  // 성격 축 — app/layout.tsx 가 정적으로 찍는다. 상태가 아니라 고정값.
  await expect(html).toHaveAttribute('data-theme', 'pullim-os');

  // 명암 축 — SchemeProvider(next-themes, attribute="data-scheme")가 클라이언트에서 붙인다.
  // ⚠ `data-theme="dark"` 로 다크를 지정하면 성격 슬롯을 뺏어 테마가 통째로 풀린다
  //    (components/shell/theme-provider.tsx). 두 축이 **다른 속성**이어야 한다.
  await expect(html).toHaveAttribute('data-scheme', /^(light|dark)$/);
});

// ─────────────────────────────────────────────────────────────────────────
// §2·§3 :where(:root) 폴백 — 값을 채우되 테마를 덮지 않는다
// ─────────────────────────────────────────────────────────────────────────

test('§2 [data-theme] 스코프 토큰 23 개가 값을 갖고, data-theme 이 없어도 같은 값을 유지한다', async ({
  page,
}) => {
  await open(page, '/planner');

  // ① 「값을 갖는다」 — 페이지가 실제로 떠 있는 그 상태 그대로 본다(명암 축 무관하게 성립).
  const asRendered = await readRootTokens(page, THEME_SCOPED_TOKENS);
  const missing = THEME_SCOPED_TOKENS.filter((t) => asRendered[t] === '');
  expect(missing, `data-theme="pullim-os" 인데 값이 빈 토큰`).toEqual([]);

  // ② 「폴백이 같은 값을 유지한다」 — 라이트로 고정하고 비교한다(SCHEME_PINNED 주석 참고).
  //    app/layout.tsx 의 <html data-theme> 한 줄이 사라진 상황을 재현한다.
  //    :where(:root) 폴백(특정도 0, 레이어 밖)이 받아내야 한다 — #218 C.
  const withTheme = await readTokensUnderTheme(page, 'pullim-os', THEME_SCOPED_TOKENS);
  const withoutTheme = await readTokensUnderTheme(page, null, THEME_SCOPED_TOKENS);

  const emptied = THEME_SCOPED_TOKENS.filter((t) => withoutTheme[t] === '');
  expect(emptied, `data-theme 제거 후 값을 잃은 토큰`).toEqual([]);

  // 「비었나」가 아니라 「같나」로 본다. elevation 4 개는 Tailwind 기본 그림자로 **조용히
  // 대체**되므로 비어 보이지 않고(위 ELEVATION_TOKENS 주석), 나머지 19 개도 폴백 값이
  // 원본에서 드리프트하면(오타·다크 블록에서 복사) 비어 있지 않은 채 틀린다.
  // 그래서 **23 개 전체**를 동등성으로 본다 — 이 테스트 이름이 약속하는 것도 그것이다.
  // (Codex 리뷰 #226 2 차)
  const drifted = THEME_SCOPED_TOKENS.filter((t) => withoutTheme[t] !== withTheme[t]).map(
    (t) => `${t}:\n    with    ${withTheme[t]}\n    without ${withoutTheme[t]}`,
  );
  expect(drifted, `data-theme 제거 후 값이 달라진 토큰 (:where(:root) 폴백 드리프트)`).toEqual([]);
});

test('§3 :where(:root) 폴백이 테마를 덮지 않는다 — pullim-jr 로 바꾸면 jr elevation 이 나온다', async ({
  page,
}) => {
  await open(page, '/planner');

  // 둘 다 라이트 고정으로 읽는다 — os·jr 의 **다크** elevation 은 네 단계가 같은 값이라
  // 다크에서 비교하면 이 단언이 뜻을 잃는다(SCHEME_PINNED 주석).
  const os = await readTokensUnderTheme(page, 'pullim-os', ELEVATION_TOKENS);
  const jr = await readTokensUnderTheme(page, 'pullim-jr', ELEVATION_TOKENS);

  // 폴백을 맨 `:root` 로 쓰면 특정도가 [data-theme=…] 과 같아(0,1,0) 소스 순서가 이기고,
  // 폴백(뒤에 온다)이 테마를 **덮는다** — pullim-jr 이 os 로 뭉개진다. `:where()` 로
  // 특정도를 0 으로 낮춰야 순서와 무관하게 테마가 이긴다. #218 C 가 컴파일로만 확인한 자리.
  for (const t of ELEVATION_TOKENS) {
    expect(jr[t], `${t} 가 pullim-jr 에서도 os 값이다 — 폴백이 테마를 덮고 있다`).not.toBe(os[t]);
    expect(jr[t], `${t} 가 pullim-jr 에서 비었다`).not.toBe('');
  }
});

// ─────────────────────────────────────────────────────────────────────────
// §4·§5 유틸리티가 실제로 값을 갖는가
// ─────────────────────────────────────────────────────────────────────────

/**
 * 무조건 걸리는(variant 접두사 없는) 유틸리티만 센다.
 * `hover:shadow-pullim-sm` 은 평시에 안 켜지므로 세면 오탐이 된다 — 클래스 **토큰 전체**가
 * 정확히 일치할 때만 잡는다.
 */
async function collectUtilityTargets(page: Page) {
  return page.evaluate(() => {
    const SHADOW = /^shadow-pullim-(xs|sm|md|lg|glow)$/;
    const BG = /^bg-pullim-[a-z0-9-]+(\/\d+)?$/;
    const shadows: { cls: string; value: string; tag: string; where: string }[] = [];
    const backgrounds: { cls: string; value: string; tag: string; where: string }[] = [];

    for (const el of document.querySelectorAll<HTMLElement>('*')) {
      const classes = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      const where = classes.join(' ').slice(0, 90);
      const tag = el.tagName.toLowerCase();

      const s = classes.find((c) => SHADOW.test(c));
      if (s) shadows.push({ cls: s, value: getComputedStyle(el).boxShadow, tag, where });

      const g = classes.find((c) => BG.test(c));
      if (g) backgrounds.push({ cls: g, value: getComputedStyle(el).backgroundColor, tag, where });
    }
    return { shadows, backgrounds };
  });
}

for (const route of ROUTES) {
  test(`§4 ${route} — shadow-pullim-* 가 실제 box-shadow 를 그린다`, async ({ page }) => {
    await open(page, route);
    await settle(page, '[class*="shadow-pullim-"]');
    const { shadows } = await collectUtilityTargets(page);

    // 대상이 0 이면 검사가 조용히 아무것도 안 지킨다 — 화면이 바뀌어 대상이 사라졌다면
    // 그 사실을 실패로 드러낸다(classbot 이 80 파일 미만 스캔을 실패 처리하는 것과 같은 취지).
    expect(shadows.length, `${route} 에 shadow-pullim-* 사용처가 없다 — 검사 대상 소실`).toBeGreaterThan(0);

    // #218 A: `--shadow-pullim-*` 가 @theme 밖(맨 :root)에 있으면 Tailwind v4 는
    // `.shadow-pullim-*` **규칙 자체를 생성하지 않는다**. 클래스는 붙어 있는데 그림자는 없다.
    const dead = shadows.filter((s) => s.value === 'none' || s.value === '');
    expect(
      dead,
      `그림자가 렌더되지 않는 요소:\n${dead.map((d) => `  ${d.cls} on <${d.tag}> "${d.where}"`).join('\n')}`,
    ).toEqual([]);

    // 그리고 그 값이 **PUDS elevation** 이어야 한다. stock `shadow-sm` 으로 치환되면
    // 그림자는 보이지만 var(--shadow-sm) 을 안 읽어 data-theme·data-scheme 추종을 잃는다.
    // 기대값은 하드코딩하지 않고 런타임 토큰에서 뽑는다.
    const tokens = await readRootTokens(page, ELEVATION_TOKENS);
    const rgbOf = (css: string): string | null => {
      // 브라우저는 rgba(13,26,31,.06) 을 #0d1a1f0f 로 직렬화하기도 한다 — 두 형태를 모두 받는다.
      const hex = css.match(/#([0-9a-f]{6})(?:[0-9a-f]{2})?\b/i);
      if (hex) {
        const h = hex[1];
        return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
      }
      const m = css.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
      return m ? `${Math.round(+m[1])},${Math.round(+m[2])},${Math.round(+m[3])}` : null;
    };

    const expectedRgb = new Set(
      ELEVATION_TOKENS.map((t) => rgbOf(tokens[t])).filter((x): x is string => x !== null),
    );
    expect(expectedRgb.size, 'elevation 토큰에서 색을 뽑지 못했다').toBeGreaterThan(0);

    // box-shadow 는 여러 레이어가 이어 붙는다(`rgba(0,0,0,0) 0 0 0 0, … , <실제>`).
    // 투명 레이어를 빼고 남는 색이 토큰 색이어야 한다.
    const offToken = shadows.filter((s) => {
      const painted = s.value
        .split(/,(?![^(]*\))/)
        .map((layer) => layer.trim())
        .filter((layer) => !/rgba?\([^)]*,\s*0\s*\)/.test(layer));
      return !painted.some((layer) => {
        const rgb = rgbOf(layer);
        return rgb !== null && expectedRgb.has(rgb);
      });
    });
    expect(
      offToken,
      `PUDS elevation 토큰 색이 아닌 그림자 (stock shadow 치환?):\n` +
        offToken.map((d) => `  ${d.cls} on <${d.tag}> = ${d.value}`).join('\n'),
    ).toEqual([]);
  });

  test(`§5 ${route} — bg-pullim-* 배경이 실제로 칠해진다`, async ({ page }) => {
    await open(page, route);
    await settle(page, '[class*="bg-pullim-"]');
    const { backgrounds } = await collectUtilityTargets(page);

    expect(
      backgrounds.length,
      `${route} 에 bg-pullim-* 사용처가 없다 — 검사 대상 소실`,
    ).toBeGreaterThan(0);

    // 정의되지 않은 토큰을 참조하면 Tailwind 는 클래스를 아예 만들지 않고, 만들더라도
    // 빈 var() 는 조용히 투명이 된다. #218 B 의 `--color-pullim-warn-cta-bg` 가 그 형태였다
    // (이월 블록 좌측 경고 스트라이프가 투명했다).
    const transparent = backgrounds.filter((b) => b.value === 'rgba(0, 0, 0, 0)' || b.value === 'transparent');
    expect(
      transparent,
      `배경이 투명한 bg-pullim-* 요소:\n${transparent.map((d) => `  ${d.cls} on <${d.tag}> "${d.where}"`).join('\n')}`,
    ).toEqual([]);
  });
}
