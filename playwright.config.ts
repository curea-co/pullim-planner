import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright — 실브라우저 회귀. 형제 저장소(classbot·Q)의 관례를 따른다.
 *
 * ── 왜 이게 필요한가 ────────────────────────────────────────────────────
 * 이 저장소의 특징적인 결함은 **타입도 린트도 Jest 도 통과한 채로** 나간다.
 * #218 이 되살린 세 유틸리티가 그 형태였고(「유효한 CSS 인데 아무것도 매치하지 않는다」),
 * 그 PR 의 검증란은 이렇게 적혀 있다 — **「브라우저로는 보지 못했다. 화면 영향은 컴파일
 * 산출물에서 추론한 것이다.」** jsdom(Jest)은 Tailwind 를 컴파일하지 않으므로 그 추론을
 * 확인할 수단이 저장소에 없었다. 이 설정이 그 경로를 연다.
 *
 * ── 형제 저장소와 다른 점, 그리고 이유 ──────────────────────────────────
 * · **설정 위치**: 저장소 루트. 둘 다 「패키지 루트」에 둔다(classbot=apps/classbot,
 *   Q=apps). planner 는 워크스페이스가 아니라 단일 패키지라 패키지 루트가 곧 저장소 루트다.
 * · **testDir 는 `e2e`** (Q 와 같은 이름). 새로 고른 게 아니라 이미 정해져 있었다 —
 *   `jest.config.ts` 의 `testPathIgnorePatterns` 가 `<rootDir>/e2e/` 를 이미 제외한다.
 * · **`webServer` 를 둔다 (Q 쪽)**. classbot 은 webServer 가 없어 외부 dev 서버를 전제하고,
 *   그래서 classbot 의 CI 는 e2e 잡을 **아예 제외**한다(ci.yml 주석). planner 는 CI 에서
 *   돌려야 하므로 서버를 스스로 띄우는 Q 의 형태가 맞다.
 * · **mock 서버가 없다 (Q 와 다름)**. Q 는 `/q/*` 가 **서버측** proxy introspection 으로
 *   막혀 있어 라우트 목으로 못 뚫고 실서버 mock(:4590)이 필요했다. planner 의 게이트는
 *   `RequireAuth` → `AuthProvider` 로 **전부 클라이언트**라, 저장소가 이미 갖고 있는
 *   `NEXT_PUBLIC_DEV_AUTH_BYPASS` 로 충분하다(아래).
 *
 * ── 인증 ────────────────────────────────────────────────────────────────
 * `(student)` 그룹은 `RequireAuth` 뒤에 있고, 세션은 `*.pullim.local`/`*.pullim.ai`
 * same-site 쿠키라 `localhost` 에서는 복원되지 않는다 — 그대로 열면
 * 「연결에 문제가 있어 로그인 상태를 확인하지 못했어요」(status='error')에 걸린다.
 *
 * 답은 저장소가 이미 갖고 있다: `NEXT_PUBLIC_DEV_AUTH_BYPASS=1`
 * (`lib/auth/auth-context.tsx` · `.env.example` 에 이 용도로 문서화돼 있다).
 * **3중 가드**라 배포에 샐 수 없다 — ① `NODE_ENV === 'development'`(= `next dev`.
 * prod 빌드면 정적으로 false → tree-shake) ② 브라우저 + localhost 류 hostname
 * ③ env 플래그 opt-in. 아래 `env` 는 ③ 만 켠다. **가드를 약화시키지 마라 —
 * 우회를 넓히는 게 아니라 이미 있는 문을 쓰는 것이다.**
 *
 * 그래서 webServer 는 `next start` 가 아니라 **`bun run dev`** 여야 한다(가드 ①).
 *
 * ⚠ 로컬에서 돌릴 때: 3006 에 이미 dev 서버가 떠 있으면 `reuseExistingServer` 가 그걸
 * 재사용한다. 그 서버가 `NEXT_PUBLIC_DEV_AUTH_BYPASS=1` 없이 떠 있었다면 아래 `env` 는
 * 적용되지 않고(이미 뜬 프로세스에 주입할 수 없다) 테스트가 인증 벽에 막힌다 —
 * 그 서버를 내리고 다시 돌리면 여기서 새로 띄운다. (Q 의 fixtures.ts 에 같은 주의가 있다.)
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // CI 에서 `github` 만 켜면 주석 애노테이션만 남고 **`playwright-report/` 가 생성되지 않는다**
  // — ci.yml 이 실패 시 올리려는 그 디렉터리다. HTML 리포터를 함께 켜서 아티팩트가
  // 빈손이 되지 않게 한다(`open: 'never'` — 러너에서 브라우저를 띄우면 안 된다). (Codex 리뷰 #226 3 차)
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3006',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run dev',
    // `/planner` 로 폴링해 라우트 컴파일까지 끝내고 시작한다(next dev 는 on-demand 컴파일).
    url: 'http://localhost:3006/planner',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // 인증 게이트 우회 — 위 「인증」 절 참고. NEXT_PUBLIC_* 은 dev 서버 기동 시
      // 인라인되므로 여기서 주입해야 한다(Q 의 webServer.env 와 같은 이유).
      NEXT_PUBLIC_DEV_AUTH_BYPASS: '1',
    },
  },
});
