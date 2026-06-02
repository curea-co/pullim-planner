import { IsEmail, IsNotEmpty, IsString } from "class-validator";

import { NormalizeEmail } from "../../../../common/decorators/normalize-email.decorator";

export class LoginDto {
  @NormalizeEmail()
  @IsEmail({}, { message: "올바른 이메일 형식이 아닙니다." })
  email: string;

  @IsString()
  @IsNotEmpty({ message: "비밀번호를 입력해주세요." })
  password: string;
}
