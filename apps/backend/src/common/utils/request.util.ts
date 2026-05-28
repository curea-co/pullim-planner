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
 * X-Forwarded-For 헤더가 있으면 첫 번째 IP를 반환하고, 없으면 req.ip를 사용한다.
 * @param req - Express Request 객체
 * @returns 클라이언트 IP 문자열
 */
export function parseClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first =
    typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]?.trim()
        : undefined;

  return first || req.ip || "0.0.0.0";
}
