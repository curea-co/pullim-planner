import { createPullimSessionClient } from '@/lib/api-client/pullim-session';

function clientFor(body: unknown) {
  const fetchImpl = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>(async () => ({
    ok: true, status: 200, text: async () => JSON.stringify(body),
  } as Response));
  return { client: createPullimSessionClient({ baseUrl: 'https://api.test', fetchImpl }), fetchImpl };
}

it.each([null, { id: 'profile-1', name: 'student' }])('unwraps a successful profile status: %p', async (profile) => {
  const { client, fetchImpl } = clientFor({ profile });
  await expect(client.session()).resolves.toEqual(profile);
  expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.test/planner/me/status');
});

it.each([undefined, null, {}, { profile: undefined }, { profile: false }, { profile: {} }])('rejects malformed status instead of onboarding: %p', async (body) => {
  const { client } = clientFor(body);
  await expect(client.session()).rejects.toThrow();
});
