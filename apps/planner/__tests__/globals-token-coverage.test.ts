import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(__dirname, '../app/globals.css'), 'utf8');

// globals.css가 반드시 정의해야 하는 @theme 토큰 이름(코드가 유틸로 참조).
const REQUIRED = [
  // shadcn 시맨틱
  '--color-background', '--color-foreground', '--color-card', '--color-popover',
  '--color-primary', '--color-primary-foreground', '--color-secondary',
  '--color-muted', '--color-muted-foreground', '--color-accent', '--color-accent-foreground',
  '--color-destructive', '--color-border', '--color-input', '--color-ring',
  '--color-chart-1', '--color-chart-5',
  '--color-sidebar', '--color-sidebar-primary', '--color-sidebar-accent', '--color-sidebar-ring',
  // pullim 브랜드 블루 램프
  '--color-pullim-blue-50', '--color-pullim-blue-500', '--color-pullim-blue-600',
  '--color-pullim-blue-700', '--color-pullim-blue-950',
  // pullim 슬레이트 램프
  '--color-pullim-slate-0', '--color-pullim-slate-50', '--color-pullim-slate-100',
  '--color-pullim-slate-200', '--color-pullim-slate-500', '--color-pullim-slate-700',
  '--color-pullim-slate-900',
  // 시맨틱 상태
  '--color-pullim-success', '--color-pullim-success-bg', '--color-pullim-success-strong',
  '--color-pullim-warn', '--color-pullim-warn-bg', '--color-pullim-warn-cta-bg',
  '--color-pullim-danger', '--color-pullim-danger-bg',
  // 레몬 / 보조 / 히트 / 레벨
  '--color-pullim-lemon', '--color-pullim-lemon-soft', '--color-pullim-lemon-ink',
  '--color-pullim-violet-600', '--color-pullim-teal-600',
  '--color-pullim-heat-0', '--color-pullim-heat-5',
  '--color-pullim-lvl-1', '--color-pullim-lvl-5',
  // radius / shadow / font
  '--radius-xs', '--radius-md', '--radius-lg', '--radius-xl', '--radius-pill',
  '--shadow-pullim-xs', '--shadow-pullim-sm', '--shadow-pullim-md', '--shadow-pullim-lg', '--shadow-pullim-glow',
  '--font-sans', '--font-mono',
];

describe('globals.css token coverage', () => {
  it.each(REQUIRED)('defines %s', (name) => {
    expect(css).toContain(name);
  });

  it('imports PUDS token files', () => {
    expect(css).toContain('./tokens/_base.css');
    expect(css).toContain('./tokens/pullim-os.css');
  });

  it('does not reintroduce the pre-PUDS brand blue #3B6FF6 as primary', () => {
    // primary 라인에 옛 브라이트 블루가 하드코딩되지 않아야 함(회귀 가드)
    const primaryLine = css.split('\n').find((l) => l.includes('--primary:')) ?? '';
    expect(primaryLine).not.toContain('#3B6FF6');
  });
});
