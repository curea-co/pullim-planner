/**
 * 탭이 둘이어도 재발급은 **한 번만** 나간다 — REUSE 로 한쪽이 로그아웃되던 것 방지.
 *
 * `refreshInFlight` 도 `lastRefreshOkAt` 도 모듈 클로저라 **탭마다 따로** 존재하는데 쿠키는
 * 오리진 하나를 공유한다. 그래서 두 탭이 비슷한 시각에 만료를 만나면 **같은 리프레시 토큰을
 * 각자 제출**하고, 늦게 도착한 쪽은 이미 회전된 토큰을 내미는 꼴이 되어 거부된다. 그 401 은
 * 재발급 실패이므로 정당한 만료로 취급되어 **그 탭이 로그아웃된다.** (QA 2026-09-04 N-02)
 *
 * 두 장치가 한 쌍으로 막는다: **Web Locks 가 겹침을 막고, localStorage 공유 시각이 중복을 없앤다.**
 * 이 파일은 두 탭을 **별도 클라이언트 인스턴스**로 흉내 내 그 성질을 고정한다.
 */
import { createPullimSessionClient } from '@/lib/api-client/pullim-session';

let refreshCalls = 0;
let refreshDelayMs = 0;
/** 데이터 요청 응답 큐 — 탭별로 따로 둔다. */
const queues: Record<string, number[]> = {};

function res(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const unauthorized = { message: '인증에 실패했습니다.', statusCode: 401 };

function fetchFor(tab: string) {
  return (async (url: string) => {
    if (url.includes('/auth/csrf')) return res(200, { csrfToken: 'csrf-test' });
    if (url.includes('/auth/refresh')) {
      refreshCalls += 1;
      if (refreshDelayMs) await new Promise((r) => setTimeout(r, refreshDelayMs));
      return res(200, { id: 'u1' });
    }
    const status = queues[tab].shift() ?? 200;
    return status === 200 ? res(200, { id: 'u1' }) : res(status, unauthorized);
  }) as unknown as typeof fetch;
}

const tab = (name: string) =>
  createPullimSessionClient({ baseUrl: 'https://api.test', fetchImpl: fetchFor(name) });

/**
 * jsdom 에 `navigator.locks` 가 없어 **실제 브라우저의 직렬화를 흉내 낸다** — 이름별로 하나씩,
 * 앞의 작업이 끝나야 다음이 시작한다(Web Locks 의 계약).
 */
function installWebLocks(): () => void {
  const chains: Record<string, Promise<unknown>> = {};
  const locks = {
    request: (name: string, _opts: unknown, cb: () => Promise<unknown>) => {
      const prev = chains[name] ?? Promise.resolve();
      const next = prev.then(() => cb(), () => cb());
      chains[name] = next.catch(() => {});
      return next;
    },
  };
  Object.defineProperty(globalThis.navigator, 'locks', { value: locks, configurable: true });
  return () => {
    Reflect.deleteProperty(globalThis.navigator as unknown as object, 'locks');
  };
}

let removeLocks: () => void;

beforeEach(() => {
  refreshCalls = 0;
  refreshDelayMs = 0;
  queues.A = [];
  queues.B = [];
  localStorage.clear();
  removeLocks = installWebLocks();
});

afterEach(() => removeLocks());

describe('교차 탭 재발급', () => {
  it('두 탭이 동시에 만료를 만나도 재발급은 한 번만 나간다', async () => {
    // 각 탭: 첫 요청 401 → 재발급 → 재시도 200
    queues.A = [401, 200];
    queues.B = [401, 200];
    refreshDelayMs = 5; // 겹치도록 살짝 늦춘다

    const [a, b] = await Promise.all([tab('A').session(), tab('B').session()]);

    expect(a).toEqual({ id: 'u1' });
    expect(b).toEqual({ id: 'u1' });
    // 여기가 핵심 — 잠금이 없으면 2회가 나가고 그중 하나가 REUSE 로 거부된다
    expect(refreshCalls).toBe(1);
  });

  it('한 탭이 갱신한 직후 다른 탭은 재발급 없이 재시도만 한다', async () => {
    queues.A = [401, 200];
    await tab('A').session();
    expect(refreshCalls).toBe(1);

    // B 는 A 의 성공을 **공유 시각**으로 알아본다(자기 메모리엔 기록이 없다)
    queues.B = [401, 200];
    await expect(tab('B').session()).resolves.toEqual({ id: 'u1' });
    expect(refreshCalls).toBe(1);
  });

  it('잠금을 쓸 수 없는 환경에서도 동작한다 — 종전 경로로 떨어진다', async () => {
    removeLocks();
    queues.A = [401, 200];
    await expect(tab('A').session()).resolves.toEqual({ id: 'u1' });
    expect(refreshCalls).toBe(1);
  });
});
