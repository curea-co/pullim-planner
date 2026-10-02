import { createPullimSessionClient } from '@/lib/api-client/pullim-session';
import { ApiError, createPullimPlannerClient } from '@/lib/api-client';

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('planner typed CSRF recovery', () => {
  it('CSRF_TOKEN_MISMATCH만 bootstrap 후 원 write를 정확히 1회 재시도한다', async () => {
    const calls: Array<{ url: string; csrf: string | undefined }> = [];
    const fetchImpl = jest.fn(async (url: string, init?: RequestInit) => {
      const csrf = (init?.headers as Record<string, string> | undefined)?.['X-CSRF-Token'];
      calls.push({ url, csrf });
      if (url.endsWith('/auth/csrf')) {
        const count = calls.filter((call) => call.url.endsWith('/auth/csrf')).length;
        return response(200, { csrfToken: `csrf-${count}` });
      }
      const writes = calls.filter((call) => call.url.endsWith('/planner/routines')).length;
      return writes === 1
        ? response(403, { statusCode: 403, code: 'CSRF_TOKEN_MISMATCH', message: 'Forbidden' })
        : response(201, { id: 'routine-1' });
    }) as unknown as typeof fetch;
    const client = createPullimPlannerClient({ baseUrl: 'https://api.test', fetchImpl });

    await expect(client.createRoutine({} as never)).resolves.toEqual({ id: 'routine-1' });

    expect(calls).toEqual([
      { url: 'https://api.test/auth/csrf', csrf: undefined },
      { url: 'https://api.test/planner/routines', csrf: 'csrf-1' },
      { url: 'https://api.test/auth/csrf', csrf: undefined },
      { url: 'https://api.test/planner/routines', csrf: 'csrf-2' },
    ]);
  });

  it.each(['FORBIDDEN', 'CSRF_ORIGIN_REJECTED'])(
    '%s 403은 bootstrap/write 재시도 없이 그대로 보존한다',
    async (code) => {
      const calls: string[] = [];
      const fetchImpl = jest.fn(async (url: string) => {
        calls.push(url);
        if (url.endsWith('/auth/csrf')) return response(200, { csrfToken: 'csrf' });
        return response(403, { statusCode: 403, code, message: 'CSRF: rejected' });
      }) as unknown as typeof fetch;
      const client = createPullimPlannerClient({ baseUrl: 'https://api.test', fetchImpl });

      const error = await client.createRoutine({} as never).catch((reason: unknown) => reason);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ statusCode: 403, code });
      expect(calls).toEqual([
        'https://api.test/auth/csrf',
        'https://api.test/planner/routines',
      ]);
    },
  );
});


describe('session typed CSRF recovery', () => {
  beforeEach(() => localStorage.clear());

  it.each(['CSRF_ORIGIN_REJECTED', 'FORBIDDEN'])('%s is not retried even with a CSRF message', async (code) => {
    const calls: string[] = [];
    const fetchImpl = jest.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith('/auth/csrf')) return response(200, { csrfToken: 'csrf' });
      return response(403, { statusCode: 403, code, message: 'CSRF: Origin 검증 실패.' });
    }) as unknown as typeof fetch;
    const client = createPullimSessionClient({ baseUrl: 'https://api.test', fetchImpl });
    await expect(client.refresh()).rejects.toMatchObject({ code, statusCode: 403 });
    expect(calls).toEqual(['https://api.test/auth/csrf', 'https://api.test/auth/refresh']);
  });

  it('token mismatch retries exactly once independent of message', async () => {
    let refreshes = 0;
    let bootstraps = 0;
    const fetchImpl = jest.fn(async (url: string) => {
      if (url.endsWith('/auth/csrf')) { bootstraps++; return response(200, { csrfToken: 'csrf' }); }
      refreshes++;
      return refreshes === 1 ? response(403, { statusCode: 403, code: 'CSRF_TOKEN_MISMATCH', message: 'Forbidden' }) : response(200, { sub: 'member' });
    }) as unknown as typeof fetch;
    const client = createPullimSessionClient({ baseUrl: 'https://api.test', fetchImpl });
    await expect(client.refresh()).resolves.toEqual({ sub: 'member' });
    expect(refreshes).toBe(2);
    expect(bootstraps).toBe(2);
  });
});

it('401 후 CSRF 복구가 있어도 같은 mutation의 refresh 예산은 1회다', async () => {
  let writes = 0;
  const refreshSession = jest.fn(async () => true);
  const fetchImpl = jest.fn(async (url: string) => {
    if (url.endsWith('/auth/csrf')) return response(200, { csrfToken: 'synthetic' });
    writes++;
    const status = writes === 2 ? 403 : 401;
    return response(status, { statusCode: status, code: writes === 2 ? 'CSRF_TOKEN_MISMATCH' : 'unauthorized' });
  }) as unknown as typeof fetch;
  const client = createPullimPlannerClient({ baseUrl: 'https://api.test', fetchImpl, refreshSession });
  await expect(client.createRoutine({} as never)).rejects.toMatchObject({ statusCode: 401 });
  expect(refreshSession).toHaveBeenCalledTimes(1);
  expect(writes).toBe(3);
});

it('다른 계정으로 전환되면 refresh 대기 중이던 mutation을 재전송하지 않는다', async () => {
  let generation = 0;
  let release!: (ok: boolean) => void;
  let started!: () => void;
  const refreshing = new Promise<void>((resolve) => { started = resolve; });
  const refreshSession = jest.fn(() => { started(); return new Promise<boolean>((resolve) => { release = resolve; }); });
  let writes = 0;
  const fetchImpl = jest.fn(async (url: string) => {
    if (url.endsWith('/auth/csrf')) return response(200, { csrfToken: 'synthetic' });
    writes++;
    return response(401, { statusCode: 401 });
  }) as unknown as typeof fetch;
  const client = createPullimPlannerClient({ baseUrl: 'https://api.test', fetchImpl, refreshSession, authGeneration: () => generation });
  const pending = client.createRoutine({} as never);
  await refreshing;
  generation++;
  release(true);
  await expect(pending).rejects.toMatchObject({ name: 'AuthContextChangedError' });
  expect(writes).toBe(1);
});

it('다른 계정으로 전환되면 CSRF 대기 중이던 mutation도 최초 전송하지 않는다', async () => {
  let generation = 0;
  let release!: (value: Response) => void;
  let writes = 0;
  const fetchImpl = jest.fn(async (url: string) => {
    if (url.endsWith('/auth/csrf')) return new Promise<Response>((resolve) => { release = resolve; });
    writes++;
    return response(201, {});
  }) as unknown as typeof fetch;
  const client = createPullimPlannerClient({ baseUrl: 'https://api.test', fetchImpl, authGeneration: () => generation });
  const pending = client.createRoutine({} as never);
  generation++;
  release(response(200, { csrfToken: 'synthetic' }));
  await expect(pending).rejects.toMatchObject({ name: 'AuthContextChangedError' });
  expect(writes).toBe(0);
});

it('계정 변경 뒤 도착한 GET 응답은 이전 신원을 반환하지 않는다', async () => {
  let generation = 0;
  let release!: (value: Response) => void;
  const fetchImpl = jest.fn(() => new Promise<Response>((resolve) => { release = resolve; })) as unknown as typeof fetch;
  const { cookieRequest } = await import('@/lib/api-client/cookie-http');
  const pending = cookieRequest({ baseUrl: 'https://api.test', fetchImpl, authGeneration: () => generation }, '/me');
  generation++;
  release(response(200, { sub: 'old-account' }));
  await expect(pending).rejects.toMatchObject({ name: 'AuthContextChangedError' });
});
