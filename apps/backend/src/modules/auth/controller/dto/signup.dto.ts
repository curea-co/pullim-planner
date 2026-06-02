import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

import { NormalizeEmail } from "../../../../common/decorators/normalize-email.decorator";
import { MAX_NAME_LENGTH } from "../../../../common/constants/validation.constant";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_PATTERN,
} from "../../../../common/constants/validation.constant";

/**
 * 이메일 회원가입 요청 DTO.
 *
 * 본체 SignupBaseDto 에서 본인인증(CI/DI)·약관·소셜 필드를 제외한 Phase 0 핵심 버전.
 * 향후 그 필드들은 별도 GATED Phase 에서 재도입한다.
 */
export class SignupDto {
  @IsString()
  @IsNotEmpty({ message: "이름을 입력해주세요." })
  @MaxLength(MAX_NAME_LENGTH)
  name: string;

  @NormalizeEmail()
  @IsEmail({}, { message: "올바른 이메일 형식이 아닙니다." })
  email: string;

  @IsString()
  @IsNotEmpty({ message: "비밀번호를 입력해주세요." })
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
  })
  @MaxLength(MAX_PASSWORD_LENGTH)
  @Matches(PASSWORD_PATTERN, {
    message: "비밀번호는 영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.",
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: "비밀번호 확인을 입력해주세요." })
  passwordConfirm: string;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
}
