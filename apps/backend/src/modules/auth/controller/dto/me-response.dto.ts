import { instanceToPlain } from "class-transformer";

import type { AuthUser } from "../../../../entities/auth-user.entity";

/**
 * 현재 인증된 사용자 정보 응답. class-transformer 의 @Exclude(password 등) 직렬화
 * 규칙을 적용해 민감 필드를 차단한다.
 */
export class MeResponseDto {
  id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;

  /**
   * AuthUser 엔티티로부터 안전한 응답 DTO 를 생성한다.
   * @param user - 인증된 AuthUser
   * @returns MeResponseDto (password 등 @Exclude 필드 제외)
   */
  static from(user: AuthUser): MeResponseDto {
    const plain = instanceToPlain(user) as Record<string, unknown>;
    const dto = new MeResponseDto();
    dto.id = plain.id as string;
    dto.name = plain.name as string;
    dto.email = plain.email as string;
    dto.role = plain.role as string;
    dto.isEmailVerified = plain.isEmailVerified as boolean;
    return dto;
  }
}
