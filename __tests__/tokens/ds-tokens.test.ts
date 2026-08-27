/**
 * PUDS(Pullim Design System) 별칭 lock 테스트.
 * 플래너 토큰(pullim-blue/slate/semantic/lemon)이 globals.css @theme에서
 * PUDS 토큰(primary/gray/success.../secondary)에 **별칭**돼 있는지 단언한다.
 * 누가 별칭을 하드코딩 hex로 되돌리면 이 테스트가 먼저 실패해 re-skin 회귀를 막는다.
 * (PUDS 토큰 정의는 app/tokens/_base.css·pullim-jr.css — data-theme="pullim-jr"에서 해석)
 *
 * 2026-08-26 — 명암 축(data-scheme) 도입:
 * `@theme inline` 은 값을 유틸리티에 인라인해 버려서 `--color-gray-*` 를 직접 가리키면
 * 다크에서 뒤집을 수 없다. 그래서 레거시 램프는 `--pl-*` 우회 변수를 한 겹 거친다.
 * `alias()` 를 **전이적으로** 풀어 기존 단언의 취지(= 결국 PUDS 램프에 닿는다)를 그대로 지킨다.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf-8');

/** 소스에서 처음 나오는 `<name>: var(<ref>)` 의 ref (라이트 :root 가 다크 블록보다 앞) */
function aliasOnce(name: string): string | null {
  const m = css.match(new RegExp(`${name}:\\s*var\\((--[\\w-]+)\\)`));
  return m ? m[1] : null;
}

/**
 * `<name>: var(<ref>)` 별칭의 ref를 반환. `--pl-*` 우회 변수면 한 겹 더 풀어
 * 최종 PUDS 토큰을 돌려준다 (없으면 null).
 */
function alias(name: string): string | null {
  const ref = aliasOnce(name);
  return ref && ref.startsWith('--pl-') ? aliasOnce(ref) : ref;
}

describe('PUDS 토큰 별칭 (re-skin lock)', () => {
  it('PUDS 토큰 CSS를 import 한다', () => {
    expect(css).toContain('./tokens/_base.css');
    expect(css).toContain('./tokens/pullim-jr.css');
  });

  describe('brand blue → primary', () => {
    it.each([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950])(
      'pullim-blue-%i → primary-%i',
      (s) => {
        expect(alias(`--color-pullim-blue-${s}`)).toBe(`--color-primary-${s}`);
      },
    );
  });

  describe('slate → gray', () => {
    it.each([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950])(
      'pullim-slate-%i → gray-%i',
      (s) => {
        expect(alias(`--color-pullim-slate-${s}`)).toBe(`--color-gray-${s}`);
      },
    );
    it('slate-0 → surface-raised', () => {
      expect(alias('--color-pullim-slate-0')).toBe('--surface-raised');
    });
    it('slate-25는 별도 상단 톤 — 50과 수렴하지 않는다', () => {
      // --pl-slate-25 우회를 거친 뒤의 라이트 실값이 color-mix 여야 한다 (gray-50 단순 별칭이 아님)
      expect(aliasOnce('--color-pullim-slate-25')).toBe('--pl-slate-25');
      const m = css.match(/--pl-slate-25:\s*([^;]+);/);
      expect(m?.[1]).toContain('color-mix');
    });
  });

  describe('semantic → PUDS ramp', () => {
    it.each<[string, string]>([
      ['--color-pullim-success',    '--color-success-600'],
      ['--color-pullim-success-bg', '--color-success-50'],
      ['--color-pullim-warn',       '--color-warning-600'],
      ['--color-pullim-warn-bg',    '--color-warning-50'],
      ['--color-pullim-danger',     '--color-danger-600'],
      ['--color-pullim-danger-bg',  '--color-danger-50'],
    ])('%s → %s', (name, ref) => {
      expect(alias(name)).toBe(ref);
    });
  });

  // lemon은 의도적으로 PUDS secondary-500 별칭에서 이탈한다. 실 브랜드 레몬은 코치(writing/admissions)가
  // 쓰는 vivid #E6FF4C 이고, PUDS secondary-500(oklch 0.967 0.197 116)은 sRGB 클램프 시 창백해져
  // 디자인 시스템(코치)과 어긋난다. → CTA 어포던스·코치 정합을 위해 hex 리터럴로 고정.
  it('lemon → vivid #E6FF4C (코치 브랜드 레몬; PUDS secondary-500 클램프 회피)', () => {
    expect(css).toMatch(/--color-pullim-lemon:\s*#E6FF4C/i);
  });

  describe('radius → PUDS 토큰 별칭 (테마 전환 따라감, px 리터럴 금지)', () => {
    it.each(['xs', 'sm', 'md', 'lg', 'xl', '2xl'])('radius-%s → puds-radius-%s', (s) => {
      expect(alias(`--radius-${s}`)).toBe(`--puds-radius-${s}`);
    });
    it('radius-pill → puds-radius-full', () => {
      expect(alias('--radius-pill')).toBe('--puds-radius-full');
    });
  });

  describe('shadcn semantic → PUDS', () => {
    it.each<[string, string]>([
      ['--background', '--surface-raised'],
      ['--foreground', '--text-primary'],
      ['--primary',    '--color-action-primary'],
      ['--border',     '--border-default'],
      ['--ring',       '--focus-ring-color'],
    ])('%s → %s', (name, ref) => {
      expect(alias(name)).toBe(ref);
    });
  });

  // ── 명암 축 lock (2026-08-26) ───────────────────────────────────────────
  describe('다크는 data-scheme 축 하나뿐', () => {
    it('.dark 클래스 축 정의가 남아 있지 않다', () => {
      // `.dark { … }` 규칙 블록. @custom-variant 안의 문자열은 대상이 아니다.
      expect(css).not.toMatch(/^\.dark\s*\{/m);
    });

    it('dark: 유틸리티가 [data-scheme="dark"] 에 물려 있다', () => {
      expect(css).toMatch(/@custom-variant\s+dark\s*\([^)]*data-scheme="dark"/);
    });

    it('data-theme="dark" 로 다크를 지정하지 않는다 (성격 슬롯 침범)', () => {
      expect(css).not.toContain('data-theme="dark"');
    });

    it('레거시 램프는 --pl-* 우회를 거친다 (@theme inline 인라인 회피)', () => {
      for (const s of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
        expect(aliasOnce(`--color-pullim-slate-${s}`)).toBe(`--pl-slate-${s}`);
      }
    });

    it('[data-scheme="dark"] 가 레거시 램프를 반전한다', () => {
      const dark = css.slice(css.indexOf('[data-scheme="dark"] {'));
      expect(dark).toMatch(/--pl-slate-900:\s*var\(--color-gray-50\)/);   // 본문 글자 → 밝게
      expect(dark).toMatch(/--pl-slate-50:\s*var\(--color-gray-800\)/);   // 은은한 채움 → 어둡게
      expect(dark).toMatch(/--pl-slate-200:\s*var\(--color-gray-700\)/);  // 기본 경계
      expect(dark).toMatch(/--pl-warn-bg:\s*var\(--color-warning-900\)/); // 상태 틴트 바탕
    });
  });

  // ── PUDS 벤더링 토큰 무결성 ────────────────────────────────────────────
  describe('벤더링 토큰', () => {
    it('_animations.css 는 벤더링만 하고 import 하지 않는다 (tw-animate-css 와 충돌)', () => {
      expect(css).toContain('@import "tw-animate-css"');
      expect(css).not.toMatch(/@import\s+"\.\/tokens\/_animations\.css"/);
    });

    it('--radius-* 를 :root 에서도 내보낸다 (PUDS 는 rounded-[var(--radius-md)] 로 직접 읽는다)', () => {
      for (const s of ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full']) {
        expect(css).toMatch(new RegExp(`--radius-${s}:\\s*var\\(--puds-radius-${s}\\)`));
      }
    });
  });
});
