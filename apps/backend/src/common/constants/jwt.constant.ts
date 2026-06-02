/** Access Token 기본 만료(초) — 1시간. env `JWT_EXPIRATION` 으로 override. */
export const DEFAULT_JWT_EXPIRATION = 3600;
/** Refresh Token 기본 만료(초) — 7일. env `JWT_REFRESH_EXPIRATION` 으로 override. */
export const DEFAULT_JWT_REFRESH_EXPIRATION = 604800;

export const JWT_ENCODING = "base64url" as const;
export const JWT_PARTS_COUNT = 3;
export const JWT_PAYLOAD_INDEX = 1;
export const JWT_HASH_ALGORITHM = "sha256";
export const JWT_HASH_ENCODING = "hex";
export const DECIMAL_RADIX = 10;

/** JWT 페이로드 타입 마커. access/refresh guard 가 교차 사용을 차단한다. */
export const JWT_TYPE_ACCESS = "access";
export const JWT_TYPE_REFRESH = "refresh";

/** base64url 디코딩으로 읽어내는 최소 페이로드 형태(서명 미검증). */
export interface JwtPayload {
  sub: string;
  jti?: string;
  exp?: number;
  [key: string]: unknown;
}
