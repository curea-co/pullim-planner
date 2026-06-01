export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;

  /**
   * 토큰 쌍으로부터 응답 DTO 를 생성한다.
   * @param tokens - accessToken, refreshToken
   * @returns TokenResponseDto
   */
  static from(tokens: {
    accessToken: string;
    refreshToken: string;
  }): TokenResponseDto {
    const dto = new TokenResponseDto();
    dto.accessToken = tokens.accessToken;
    dto.refreshToken = tokens.refreshToken;
    return dto;
  }
}
