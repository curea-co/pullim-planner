import type { Request } from "express";

/**
 * 요청 헤더에서 User-Agent를 문자열로 추출한다.
 * 배열인 경우 첫 번째 값을 반환하고, 없으면 null을 반환한다.
 * @param req - Express Request 객체
 * @returns User-Agent 문자열 또는 null
 */
export function parseUserAgent(req: Request): string | null {
  const raw = req.headers["user-agent"];

  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? null;

  return null;
}

/**
 * 클라이언트 IP를 추출한다.
 *
 * `X-Forwarded-For` 를 직접 파싱하지 않고 Express 의 `req.ip` 를 사용한다.
 * `setupSecurity()` 가 `trustProxyHops > 0` 일 때만 `app.set("trust proxy", ...)` 를
 * 설정하므로, `req.ip` 는 그 신뢰 모델을 그대로 반영한다:
 * - 프록시 비신뢰(hops=0): `req.ip` = 직접 소켓 IP (forwarded 헤더 무시)
 * - 프록시 신뢰(hops>0): Express 가 hop 수만큼 forwarded 헤더를 해석한 IP
 *
 * 수동 파싱은 trust proxy 설정을 우회해 클라이언트가 IP 를 위조할 수 있어 제거했다 (codex R7).
 * @param req - Express Request 객체
 * @returns 클라이언트 IP 문자열
 */
export function parseClientIp(req: Request): string {
  return req.ip || "0.0.0.0";
}
