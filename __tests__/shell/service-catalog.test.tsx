/**
 * 서비스 카탈로그 — 정본(pullim-Q `apps/lib/os-home.ts`) 파생 규칙을 고정한다.
 *
 * 종전 플래너는 env 를 **문자열로만** 다뤘다(`includes()` 로 티어 판정 + `https://` 하드코딩).
 * 그래서 셋이 깨져 있었다:
 *   ① 스킴 검증이 없어 `javascript:` 같은 값이 그대로 `<a href>` 가 된다
 *   ② `dev-` 만 인식해 `preview-os` 가 **프로덕션 서비스로 유출**된다
 *   ③ `https://` 하드코딩이라 포트가 유실된다
 *
 * 이 파일은 그 셋과, 플래너 고유 안전장치 2개(미설정·local 비활성)를 함께 고정한다.
 */

/** 모듈이 env 를 로드 시점에 읽으므로, 값마다 모듈을 새로 들여온다. */
async function loadCatalog(osUrl: string | undefined) {
  jest.resetModules();
  if (osUrl === undefined) delete process.env.NEXT_PUBLIC_PULLIM_OS_URL;
  else process.env.NEXT_PUBLIC_PULLIM_OS_URL = osUrl;
  return import('@/components/shell/pullim-services');
}

const ORIGINAL = process.env.NEXT_PUBLIC_PULLIM_OS_URL;
afterAll(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_PULLIM_OS_URL;
  else process.env.NEXT_PUBLIC_PULLIM_OS_URL = ORIGINAL;
});

/** 형제 앱 항목(플래너·OS 홈 제외) — href 파생 대상. */
const siblings = <T extends { key: string }>(list: T[]) =>
  list.filter((s) => s.key !== 'planner' && s.key !== 'os');

describe('env 검증 — 스킴이 http/https 가 아니면 링크를 만들지 않는다', () => {
  it.each([
    ['javascript: 스킴', 'javascript:alert(1)'],
    ['data: 스킴', 'data:text/html,<script>1</script>'],
    ['file: 스킴', 'file:///etc/passwd'],
    ['상대경로(파싱 실패)', '/os'],
    ['빈 문자열', ''],
  ])('%s → 전 항목 비활성', async (_label, value) => {
    const { PULLIM_SERVICES, osHomeUrl } = await loadCatalog(value);
    expect(osHomeUrl()).toBeUndefined();
    for (const s of PULLIM_SERVICES) {
      if (s.key === 'planner') continue; // 플래너는 내부 경로라 env 와 무관
      expect(s.href).toBeUndefined();
      expect(s.soon).toBe(true);
    }
  });

  it('미설정이면 마찬가지로 전 항목 비활성', async () => {
    const { PULLIM_SERVICES, osHomeUrl } = await loadCatalog(undefined);
    expect(osHomeUrl()).toBeUndefined();
    expect(siblings(PULLIM_SERVICES).every((s) => s.href === undefined)).toBe(true);
  });

  it('경로·쿼리가 붙어 와도 origin 만 남는다', async () => {
    const { osHomeUrl } = await loadCatalog('https://os.pullim.ai/os/settings?x=1');
    expect(osHomeUrl()).toBe('https://os.pullim.ai');
  });
});

describe('env 접두 보존 — 비프로덕션이 프로덕션으로 새지 않는다', () => {
  it('dev-os → dev-<app>', async () => {
    const { PULLIM_SERVICES } = await loadCatalog('https://dev-os.pullim.ai');
    const q = PULLIM_SERVICES.find((s) => s.key === 'q');
    expect(q?.href).toBe('https://dev-q.pullim.ai');
  });

  it('preview-os → preview-<app> — 종전에는 프로덕션으로 갔다', async () => {
    const { PULLIM_SERVICES } = await loadCatalog('https://preview-os.pullim.ai');
    const q = PULLIM_SERVICES.find((s) => s.key === 'q');
    expect(q?.href).toBe('https://preview-q.pullim.ai');
    expect(q?.href).not.toContain('https://q.pullim.ai');
  });

  it('os → <app> (프로덕션)', async () => {
    const { PULLIM_SERVICES } = await loadCatalog('https://os.pullim.ai');
    expect(PULLIM_SERVICES.find((s) => s.key === 'q')?.href).toBe('https://q.pullim.ai');
    expect(PULLIM_SERVICES.find((s) => s.key === 'junior')?.href).toBe('https://jr.pullim.ai');
  });

  it('`[<env>-]os` 형태가 아니면 비활성 — 어느 환경인지 알 수 없다', async () => {
    const { PULLIM_SERVICES } = await loadCatalog('https://something-else.pullim.ai');
    expect(siblings(PULLIM_SERVICES).every((s) => s.href === undefined && s.soon)).toBe(true);
  });
});

describe('protocol·port 보존', () => {
  it('포트가 유지된다 — 종전에는 https:// 하드코딩이라 유실됐다', async () => {
    const { PULLIM_SERVICES } = await loadCatalog('https://dev-os.pullim.ai:8443');
    expect(PULLIM_SERVICES.find((s) => s.key === 'q')?.href).toBe('https://dev-q.pullim.ai:8443');
  });

  it('http 도 http 로 유지된다', async () => {
    const { PULLIM_SERVICES } = await loadCatalog('http://dev-os.pullim.ai');
    expect(PULLIM_SERVICES.find((s) => s.key === 'q')?.href).toBe('http://dev-q.pullim.ai');
  });
});

describe('플래너 고유 안전장치 — local 티어에서 형제 앱 비활성', () => {
  it.each([
    ['localhost', 'http://localhost:3001'],
    ['*.pullim.local', 'http://os.pullim.local:3001'],
    ['127.0.0.1', 'http://127.0.0.1:3001'],
  ])('%s → 형제 앱 전부 비활성(로컬 세션이 prod 로 이탈하지 않게)', async (_l, value) => {
    const { PULLIM_SERVICES, osHomeUrl } = await loadCatalog(value);
    // OS 홈 자체는 살아 있다 — 같은 로컬 오리진이다.
    expect(osHomeUrl()).toBeDefined();
    for (const s of siblings(PULLIM_SERVICES)) {
      expect(s.href).toBeUndefined();
      expect(s.soon).toBe(true);
    }
  });
});

describe('아이콘 경로가 실제 파일을 가리킨다', () => {
  it('모든 img 아이콘이 public/ 에 존재한다 — 경로만 고치고 에셋을 빠뜨리는 것을 막는다', async () => {
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { PULLIM_SERVICES } = await loadCatalog('https://os.pullim.ai');

    const missing = PULLIM_SERVICES.filter((s) => 'img' in s.icon)
      .map((s) => (s.icon as { img: string }).img)
      .filter((img) => !existsSync(join(process.cwd(), 'public', img)));

    expect(missing).toEqual([]);
  });
});
