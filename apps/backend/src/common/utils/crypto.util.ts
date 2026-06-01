import * as crypto from "node:crypto";

import * as bcrypt from "bcrypt";

import { BCRYPT_SALT_ROUNDS } from "../constants/security.constant";

/**
 * 평문에 pepper(HMAC-SHA256)를 적용한다. bcrypt 72바이트 입력 제한을 우회하고,
 * DB 가 유출돼도 pepper(서버 측 비밀) 없이는 무력화되도록 한다. (본체 동일 패턴)
 * @param plaintext - 평문
 * @param pepper - HMAC pepper 키
 * @returns hex 인코딩된 HMAC 결과
 */
function applyPepper(plaintext: string, pepper: string): string {
  return crypto.createHmac("sha256", pepper).update(plaintext).digest("hex");
}

/**
 * 평문에 pepper 를 적용한 뒤 bcrypt 로 단방향 해싱한다.
 * @param plaintext - 평문 (비밀번호 등)
 * @param pepper - HMAC pepper 키
 * @returns bcrypt 해시 문자열
 */
export async function hashText(
  plaintext: string,
  pepper: string,
): Promise<string> {
  return bcrypt.hash(applyPepper(plaintext, pepper), BCRYPT_SALT_ROUNDS);
}

/**
 * 평문에 pepper 를 적용한 뒤 bcrypt 해시값과 일치하는지 검증한다.
 * @param plaintext - 평문
 * @param hashed - bcrypt 해시
 * @param pepper - HMAC pepper 키
 * @returns 일치 여부
 */
export async function verifyHash(
  plaintext: string,
  hashed: string,
  pepper: string,
): Promise<boolean> {
  return bcrypt.compare(applyPepper(plaintext, pepper), hashed);
}
