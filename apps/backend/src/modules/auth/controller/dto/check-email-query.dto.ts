import { IsEmail } from "class-validator";

import { NormalizeEmail } from "../../../../common/decorators/normalize-email.decorator";

export class CheckEmailQueryDto {
  @NormalizeEmail()
  @IsEmail({}, { message: "올바른 이메일 형식이 아닙니다." })
  email: string;
}
