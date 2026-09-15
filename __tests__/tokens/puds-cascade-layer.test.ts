/**
 * PUDS 벤더 CSS 가 캐스케이드 레이어 안에 머무는지 — 회귀 방지.
 *
 * `app/tokens/_base.css`(레인 ① 벤더링)는 리셋만 `@layer base` 로 감싸고 **나머지 규칙은
 * 레이어 밖에 둔다.** 레이어 밖 CSS 는 레이어 안 CSS 를 무조건 이기므로, 그 규칙들이
 * Tailwind 유틸리티를 전부 무력화한다 — 실제로 `:focus-visible { outline: …; border-radius: 2px }`
 * 가 이 리포의 `outline-none` 95곳을 전부 무시하고, 포커스된 요소의 라운드를 2px 로 강제했다.
 *
 * 벤더링본은 고칠 수 없으니(로컬 수정 금지) `app/globals.css` 에서 import 를 레이어에 담아
 * 막는다. 그 방어선이 사라지면 같은 증상이 조용히 돌아오므로 여기서 고정한다.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const globalsCssRaw = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf-8');
// 이 파일의 주석은 `@import`·`@layer` 를 **설명하느라** 그대로 담고 있다. 주석을 지우지 않으면
// "선언이 import 보다 먼저인가" 같은 위치 검사가 주석 문구에 걸려 거짓 실패한다.
const globalsCss = globalsCssRaw.replace(/\/\*[\s\S]*?\*\//g, '');

describe('PUDS 벤더 CSS 캐스케이드 레이어', () => {
  it('_base.css 를 `layer(puds)` 안으로 import 한다', () => {
    expect(globalsCss).toMatch(/@import\s+["']\.\/tokens\/_base\.css["']\s+layer\(puds\)/);
  });

  it('레이어 순서를 선언하고, puds 를 utilities 보다 **아래**에 둔다', () => {
    const stmt = globalsCss.match(/@layer\s+([^;{]+);/);
    expect(stmt).not.toBeNull();
    const names = stmt![1].split(',').map((n) => n.trim());
    expect(names).toContain('puds');
    expect(names.indexOf('puds')).toBeLessThan(names.indexOf('utilities'));
    // components 보다도 아래여야 컴포넌트 클래스가 이긴다.
    expect(names.indexOf('puds')).toBeLessThan(names.indexOf('components'));
    // Tailwind base(preflight) 보다는 위 — PUDS 리셋이 preflight 를 덮는 현재 동작 유지.
    expect(names.indexOf('puds')).toBeGreaterThan(names.indexOf('base'));
  });

  it('레이어 선언이 **첫 @import 보다 먼저** 온다', () => {
    // 레이어 순서는 「이름이 처음 등장한 순서」로 굳는다. `@import "tailwindcss"` 가 자기
    // 순서(theme·base·components·utilities)를 먼저 박으면, 뒤에 더한 `puds` 는 맨 뒤
    // (= 가장 높은 우선순위)로 붙어 고치려던 문제를 그대로 재현한다.
    const layerAt = globalsCss.search(/@layer\s+[^;{]+;/);
    const importAt = globalsCss.search(/@import/);
    expect(layerAt).toBeGreaterThanOrEqual(0);
    expect(importAt).toBeGreaterThanOrEqual(0);
    expect(layerAt).toBeLessThan(importAt);
  });

  it('레이어 밖으로 새는 PUDS 규칙이 `_base.css` 뿐인지 — 토큰 전용 파일은 그대로 둔다', () => {
    // pullim-os/jr 은 토큰 전용이라 무력화할 규칙이 없다. 레이어에 담으면 globals 의
    // unlayered `:root` 가 그쪽 `[data-theme][data-scheme="dark"]` 까지 이겨 명암 축이 깨진다.
    expect(globalsCss).toMatch(/@import\s+["']\.\/tokens\/pullim-os\.css["']\s*;/);
    expect(globalsCss).toMatch(/@import\s+["']\.\/tokens\/pullim-jr\.css["']\s*;/);
  });
});
