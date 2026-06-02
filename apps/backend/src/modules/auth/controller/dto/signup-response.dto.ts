import type { UserRole } from "../../../../entities/enums/user-role.enum";

export class SignupResponseDto {
  id: string;
  email: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;

  /**
   * 회원가입 결과로부터 응답 DTO 를 생성한다.
   * @param result - id·email·role·토큰 쌍
   * @returns SignupResponseDto
   */
  static from(result: {
    id: string;
    email: string;
    role: UserRole;
    accessToken: string;
    refreshToken: string;
  }): SignupResponseDto {
    const dto = new SignupResponseDto();
    dto.id = result.id;
    dto.email = result.email;
    dto.role = result.role;
    dto.accessToken = result.accessToken;
    dto.refreshToken = result.refreshToken;
    return dto;
  }
}
