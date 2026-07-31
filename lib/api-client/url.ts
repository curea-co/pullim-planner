/**
 * `baseUrl + path(+query)` 를 절대 URL 로 조합한다. 두 전송 계층(`http.ts`·`cookie-http.ts`)
 * 공용 — 동작 일관성을 코드로 보장하고 복붙 drift 를 막는다.
 *
 * `new URL(path, base)` 는 절대 경로(`/auth/x`)가 base 의 경로(예: 글로벌 prefix `/api`)를
 * 통째로 버리므로 쓰지 않는다. prefix 는 baseUrl 에 담는 배포 설정(예: `http://host/api`)이고,
 * path 는 그 아래 라우트(`/auth/login`)다.
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | undefined>,
): URL {
  const base = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }
  return url;
}
