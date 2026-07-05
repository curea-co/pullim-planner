/**
 * PUDS(Pullim Design System) 별칭 lock 테스트.
 * 플래너 토큰(pullim-blue/slate/semantic/lemon)이 globals.css @theme에서
 * PUDS 토큰(primary/gray/success.../secondary)에 **별칭**돼 있는지 단언한다.
 * 누가 별칭을 하드코딩 hex로 되돌리면 이 테스트가 먼저 실패해 re-skin 회귀를 막는다.
 * (PUDS 토큰 정의는 app/tokens/_base.css·pullim-jr.css — data-theme="pullim-jr"에서 해석)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf-8');

/** `<name>: var(<ref>)` 별칭의 ref를 반환 (없으면 null) */
function alias(name: string): string | null {
  const m = css.match(new RegExp(`${name}:\\s*var\\((--[\\w-]+)\\)`));
  return m ? m[1] : null;
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
      const m = css.match(/--color-pullim-slate-25:\s*([^;]+);/);
      expect(m?.[1]).toContain('color-mix'); // gray-50 단순 별칭이 아니어야
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
});
