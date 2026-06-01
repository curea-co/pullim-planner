import { Injectable } from "@nestjs/common";

import { MAX_LOGIN_ATTEMPTS } from "../../../common/constants/security.constant";
import { LoginDto } from "../controller/dto/login.dto";
import { AuthService } from "../service/auth.service";
import { AuthUserService } from "../service/auth-user.service";

/**
 * 이메일 로그인 UseCase (Facade). 사용자/제공자 검증 → 잠금 확인 → 비밀번호 검증
 * (실패 시 카운트 증가, 성공 시 초기화) → 토큰 발급을 조합한다.
 */
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly authUserService: AuthUserService,
    private readonly authService: AuthService,
  ) {}

  /**
   * 이메일과 비밀번호로 로그인을 수행한다.
   * @param dto - 로그인 요청 데이터
   * @returns accessToken, refreshToken 쌍
   */
  async execute(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const rawUser = await this.authUserService.findByEmailWithProviders(
      dto.email,
    );
    const { user, emailProvider } =
      this.authService.findEmailLoginUserOrFail(rawUser);
    this.authService.validateLoginPreConditions(emailProvider);

    try {
      await this.authService.verifyPasswordOrFail(emailProvider, dto.password);
    } catch (error) {
      await this.authUserService.incrementFailedLoginCount(
        user.id,
        MAX_LOGIN_ATTEMPTS,
      );
      throw error;
    }

    await this.authUserService.resetFailedLoginCount(user.id);

    return this.authService.generateTokens(user);
  }
}
