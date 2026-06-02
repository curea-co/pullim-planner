import { createHash } from "node:crypto";

import {
  JWT_ENCODING,
  JWT_HASH_ALGORITHM,
  JWT_HASH_ENCODING,
  JWT_PARTS_COUNT,
  JWT_PAYLOAD_INDEX,
  type JwtPayload,
} from "../constants/jwt.constant";

/**
 * JWT 페이로드를 서명 검증 없이 base64url 디코딩만으로 읽어낸다.
 * (블랙리스트 등록은 이미 서명 검증을 통과한 토큰에 대해서만 호출되므로 안전)
 * @param token - JWT 토큰 문자열
 * @returns 디코딩된 페이로드 또는 null
 */
function decodePayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== JWT_PARTS_COUNT) return null;

  try {
    return JSON.parse(
      Buffer.from(parts[JWT_PAYLOAD_INDEX], JWT_ENCODING).toString(),
    ) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * 토큰에서 토큰 ID(jti) 와 만료 시각을 추출한다.
 * jti 가 있으면 jti 를, 없으면 토큰의 SHA-256 해시를 tokenId 로 사용한다.
 * @param token - JWT 토큰 문자열
 * @returns tokenId 와 expiresAt(Date). exp 없으면 현재 시각.
 */
export function extractTokenIdAndExpiry(token: string): {
  tokenId: string;
  expiresAt: Date;
} {
  const payload = decodePayload(token);

  const tokenId =
    payload?.jti ??
    createHash(JWT_HASH_ALGORITHM).update(token).digest(JWT_HASH_ENCODING);

  const expSeconds = payload?.exp ?? Math.floor(Date.now() / 1000);

  return { tokenId, expiresAt: new Date(expSeconds * 1000) };
}
