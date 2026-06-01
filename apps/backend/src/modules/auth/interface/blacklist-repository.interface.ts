/** Refresh Token 블랙리스트 DB 접근 추상화. DI 토큰으로도 사용한다. */
export abstract class BlacklistRepositoryInterface {
  /**
   * tokenId 를 블랙리스트에 등록한다. 이미 존재하면 false 를 반환한다 (원자적).
   * @param tokenId - 토큰 ID (jti)
   * @param expiresAt - 토큰 만료 시각
   * @returns 신규 등록 성공 여부
   */
  abstract add(tokenId: string, expiresAt: Date): Promise<boolean>;

  /**
   * tokenId 가 블랙리스트에 있는지 확인한다.
   * @param tokenId - 토큰 ID (jti)
   * @returns 등록 여부
   */
  abstract exists(tokenId: string): Promise<boolean>;
}
