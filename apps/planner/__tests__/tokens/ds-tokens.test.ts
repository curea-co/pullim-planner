/**
 * Pullim DS 토큰 lock 테스트.
 * globals.css @theme inline 값이 Pullim DS canonical 값과 일치하는지 앵커로 단언한다.
 * 값이 바뀌면 이 테스트가 먼저 실패해 의도치 않은 토큰 회귀를 막는다.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf-8');

function token(name: string): string | null {
  const m = css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{3,8})`));
  return m ? m[1].toUpperCase() : null;
}

describe('Pullim DS canonical token values', () => {
  describe('brand blue', () => {
    it.each([
      ['--color-pullim-blue-50',  '#EEF3FF'],
      ['--color-pullim-blue-100', '#DCE6FF'],
      ['--color-pullim-blue-200', '#B8CDFF'],
      ['--color-pullim-blue-300', '#8BAEFF'],
      ['--color-pullim-blue-400', '#5A8BFF'],
      ['--color-pullim-blue-500', '#3B6FF6'],
      ['--color-pullim-blue-600', '#2854D8'],
      ['--color-pullim-blue-700', '#1D3FA8'],
      ['--color-pullim-blue-800', '#142C73'],
      ['--color-pullim-blue-900', '#070F2C'],
      ['--color-pullim-blue-950', '#050A1E'],
    ])('%s === %s', (name, expected) => {
      expect(token(name)).toBe(expected);
    });
  });

  describe('neutral slate', () => {
    it.each([
      ['--color-pullim-slate-50',  '#F5F7FB'],
      ['--color-pullim-slate-100', '#EDF0F5'],
      ['--color-pullim-slate-200', '#DDE2EC'],
      ['--color-pullim-slate-300', '#B7BDCD'],
      ['--color-pullim-slate-400', '#97A0B4'],
      ['--color-pullim-slate-500', '#6B7489'],
      ['--color-pullim-slate-600', '#4A536A'],
      ['--color-pullim-slate-700', '#2B3245'],
      ['--color-pullim-slate-800', '#1E2435'],
      ['--color-pullim-slate-900', '#121627'],
      ['--color-pullim-slate-950', '#0B0E1A'],
    ])('%s === %s', (name, expected) => {
      expect(token(name)).toBe(expected);
    });
  });

  describe('semantic (전경 + 배경)', () => {
    it.each([
      ['--color-pullim-success',    '#0E8C56'],
      ['--color-pullim-success-bg', '#E6F8EF'],
      ['--color-pullim-warn',       '#D97706'],
      ['--color-pullim-warn-bg',    '#FFF7E6'],
      ['--color-pullim-danger',     '#C03B3F'],
      ['--color-pullim-danger-bg',  '#FDECEC'],
    ])('%s === %s', (name, expected) => {
      expect(token(name)).toBe(expected);
    });
  });

  describe('lemon accent', () => {
    it.each([
      ['--color-pullim-lemon',      '#E6FF4C'],
      ['--color-pullim-lemon-soft', '#F4FFB8'],
      ['--color-pullim-lemon-ink',  '#5C6B0A'],
    ])('%s === %s', (name, expected) => {
      expect(token(name)).toBe(expected);
    });
  });
});
