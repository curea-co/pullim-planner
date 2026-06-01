import { IsNotEmpty, IsString } from "class-validator";

export class LogoutDto {
  @IsString()
  @IsNotEmpty({ message: "refreshToken 을 입력해주세요." })
  refreshToken: string;
}
