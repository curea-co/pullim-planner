/**
 * 401 이라고 다 로그아웃시키지 않는다 — **재발급이 만료를 확정한 401** 만 세션 만료다.
 *
 * 통지 한 번의 대가가 앱 전체 이탈(`RequireAuth` 의 `window.location.assign`)이다. 그런데
 * 월간 뷰는 하루당 한 번씩 수십 개를 동시에 쏘고, 그 훅은 날짜별 실패를 빈 배열로 삼켜
 * "그날은 계획 없음"으로 그린다. 그래서 그중 **하나만** 일과성 401 을 받아도 화면은 조용한
 * 채 앱이 로그인으로 튕겼다 — 사용자에겐 원인이 안 보인다. (QA 2026-09-04 N-02)
 *
 * 판정은 `cookie-http` 가 이미 한다. 이 파일은 그 판정이 `sessionExpired` 로 정확히 실려
 * 나가는지를 고정한다 — 두 방향 모두.
 */
import { createPullimSessionClient } from '@/lib/api-client/pullim-session';
import { ApiError } from '@/lib/api-client';

let refreshOk = true;
/** 재시도(2번째 데이터 요청)도 401 을 내는가 — 「재발급은 됐는데 그 요청만 실패」 재현. */
let retryAlso401 = false;
let dataCalls = 0;

function res(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const unauthorized = { message: '인증에 실패했습니다.', statusCode: 401 };

const fetchImpl = (async (url: string) => {
  // CSRF 부트스트랩은 refresh 가 POST 라 반드시 선행한다 — 데이터 호출로 세면 안 된다.
  if (url.includes('/auth/csrf')) return res(200, { csrfToken: 'csrf-test' });
  if (url.includes('/auth/refresh')) {
    return refreshOk ? res(200, { id: 'u1' }) : res(401, unauthorized);
  }
  dataCalls += 1;
  // 1번째는 항상 401(액세스 만료). 2번째(재시도)는 시나리오에 따라.
  if (dataCalls === 1) return res(401, unauthorized);
  return retryAlso401 ? res(401, unauthorized) : res(200, { id: 'u1' });
}) as unknown as typeof fetch;

function makeClient() {
  return createPullimSessionClient({ baseUrl: 'https://api.test', fetchImpl });
}

beforeEach(() => {
  refreshOk = true;
  retryAlso401 = false;
  dataCalls = 0;
});

describe('401 의 두 갈래', () => {
  it('재발급이 만료를 확정하면 sessionExpired — 로그아웃시켜야 하는 401', async () => {
    refreshOk = false;
    const err = await makeClient().session().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).statusCode).toBe(401);
    expect((err as ApiError).sessionExpired).toBe(true);
  });

  it('재발급은 됐는데 재시도가 또 401이면 sessionExpired 아님 — 그 요청만 실패시킨다', async () => {
    retryAlso401 = true;
    const err = await makeClient().session().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).statusCode).toBe(401);
    // 여기가 이 PR 의 핵심 — 예전에는 이 401 도 앱 전체를 로그아웃시켰다
    expect((err as ApiError).sessionExpired).toBe(false);
  });

  it('재발급 후 재시도가 성공하면 아무 일도 없다 — 정상 경로', async () => {
    await expect(makeClient().session()).resolves.toEqual({ id: 'u1' });
  });
});
