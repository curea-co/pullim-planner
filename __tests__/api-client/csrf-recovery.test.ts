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
