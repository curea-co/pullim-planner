'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * SchemeProvider — PUDS 명암 축(`data-scheme`) 배선.
 *
 * PUDS 는 두 축을 서로 다른 속성으로 나눈다 (docs/consuming.md §3):
 *   - `data-theme`  = 성격 (pullim-os · pullim-jr) → app/layout.tsx 가 고정
 *   - `data-scheme` = 명암 (light · dark)          → 이 프로바이더가 관리
 *
 * `data-theme="dark"` 로 다크를 지정하면 성격 슬롯을 뺏어 테마가 통째로 풀린다.
 * 반드시 `data-scheme` 이어야 한다.
 *
 * next-themes 는 `theme === 'system'` 일 때 resolvedTheme('light'|'dark')을 속성에 쓰므로
 * DOM 에는 항상 `data-scheme="light"` 또는 `"dark"` 만 남는다 — PUDS 의 `auto` 값은 쓰지 않는다.
 *
 * 기본값이 'light' 인 이유: 화면 표면 상당수가 아직 고정 명도 유틸(`text-pullim-slate-900` 등)로
 * 짜여 있다. globals.css 의 `[data-scheme="dark"]` 램프 반전으로 대부분 따라오지만
 * 전 화면 검수 전까지는 다크를 기본으로 켜지 않는다. (사용자 선택 시에는 정상 동작)
 */
export function SchemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-scheme"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
