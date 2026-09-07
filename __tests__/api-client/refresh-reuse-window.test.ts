/**
 * 재발급 직후 늦게 도착한 401 이 **2차 재발급**을 부르지 않는다 — 일시 401 한 건이 앱을
 * 로그아웃시키던 구조 방지. (QA 2026-09-04 N-02)
 *
 * `refreshInFlight` single-flight 는 **동시에 진행 중인** 재발급만 합친다. 재발급이 끝나
 * 잠금이 풀린 **직후**에 도착한 401 은 그 그물을 빠져나가 2차 재발급을 시작하고, 회전된
 * 리프레시 토큰을 재제출해 거부되면 원 401 이 그대로 올라가 세션 만료로 전파된다.
 * 그 시점엔 쿠키가 이미 새것이라 **재시도만 하면 됐다.**
 *
 * 월간 뷰가 한 화면에서 하루당 한 번씩 수십 개를 동시에 쏘기 때문에(`use-home-blocks`),
 * "응답이 흩어져 도착하는" 이 상황은 예외가 아니라 기본값에 가깝다.
 */
import { createPullimSessionClient } from '@/lib/api-client/pullim-session';
import { ApiError } from '@/lib/api-client';

/** 데이터 요청에 돌려줄 상태코드 큐 — 늦은 401 을 순서로 재현한다. */
let dataStatuses: number[] = [];
let refreshCalls = 0;
/** `/auth/refresh` 가 성공하는가 — 실패 시 창의 기준점이 찍히지 않아야 한다. */
let refreshOk = true;

function res(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const fetchImpl = (async (url: string) => {
  if (url.includes('/auth/refresh')) {
    refreshCalls += 1;
    return refreshOk
      ? res(200, { id: 'u1' })
      : res(401, { message: '인증에 실패했습니다.', statusCode: 401 });
  }
  const status = dataStatuses.shift() ?? 200;
  return status === 200
    ? res(200, { id: 'u1' })
    : res(status, { message: '인증에 실패했습니다.', statusCode: status });
}) as unknown as typeof fetch;

function makeClient() {
  return createPullimSessionClient({ baseUrl: 'https://api.test', fetchImpl });
}

let nowMs = 1_000_000;

beforeEach(() => {
  dataStatuses = [];
  refreshCalls = 0;
  refreshOk = true;
  nowMs = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('재발급 직후의 늦은 401', () => {
  it('재발급을 다시 하지 않고 재시도만 한다 — 회전된 토큰 재제출을 막는다', async () => {
    const client = makeClient();
    // 첫 요청: 401 → 재발급 → 재시도 200
    dataStatuses = [401, 200];
    await expect(client.session()).resolves.toEqual({ id: 'u1' });
    expect(refreshCalls).toBe(1);

    // 같은 버스트의 늦은 응답: 401 이 이제서야 도착 — 쿠키는 이미 새것이다
    dataStatuses = [401, 200];
    await expect(client.session()).resolves.toEqual({ id: 'u1' });
    expect(refreshCalls).toBe(1); // 2차 재발급이 나가면 안 된다
  });

  it('창이 지나면 정상적으로 다시 재발급한다 — 진짜 만료를 막지 않는다', async () => {
    const client = makeClient();
    dataStatuses = [401, 200];
    await client.session();
    expect(refreshCalls).toBe(1);

    nowMs += 6_000; // 창(5초) 밖
    dataStatuses = [401, 200];
    await client.session();
    expect(refreshCalls).toBe(2);
  });

  it('재발급이 실패했으면 창을 열지 않는다 — 쿠키가 안 갈렸으므로 건너뛰면 안 된다', async () => {
    const client = makeClient();
    refreshOk = false;
    dataStatuses = [401];
    // 재발급 401 → 만료 확정(false) → 원 401 전파
    await expect(client.session()).rejects.toBeInstanceOf(ApiError);
    expect(refreshCalls).toBe(1);

    // 곧바로 다음 요청 — 실패한 재발급이 창을 열어 뒀다면 여기서 재발급을 건너뛴다
    refreshOk = true;
    dataStatuses = [401, 200];
    await expect(client.session()).resolves.toEqual({ id: 'u1' });
    expect(refreshCalls).toBe(2);
  });
});
