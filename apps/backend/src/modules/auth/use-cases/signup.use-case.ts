import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import { ErrorMessages } from "../../../common/constants/error-messages.constant";
import { UserRole } from "../../../entities/enums/user-role.enum";
import { SignupDto } from "../controller/dto/signup.dto";
import { AuthService } from "../service/auth.service";
import { AuthUserService } from "../service/auth-user.service";

/**
 * 이메일 회원가입 UseCase (Facade). 비밀번호 확인 → 이메일 중복 검증 → 해시 →
 * 사용자+EMAIL 제공자 생성 → 토큰 발급을 조합한다. 비즈니스 로직은 Service 에 위임.
 *
 * Phase 1 에서 트랜잭션 내부에 도메인 `users` 프로비저닝이 추가된다.
 */
@Injectable()
export class SignupUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly authUserService: AuthUserService,
    private readonly authService: AuthService,
  ) {}

  /**
   * 이메일 회원가입을 수행한다.
   * @param dto - 회원가입 요청 데이터
   * @returns 사용자 식별 정보와 토큰 쌍
   */
  async execute(dto: SignupDto): Promise<{
    id: string;
    email: string;
    role: UserRole;
    accessToken: string;
    refreshToken: string;
  }> {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException(
        ErrorMessages.USER_PASSWORD_CONFIRM_MISMATCH,
      );
    }
    await this.authUserService.validateEmailUniqueness(dto.email);

    const passwordHash = await this.authService.hashPassword(dto.password);

    const savedUser = await this.dataSource.transaction(async (manager) => {
      return this.authUserService.createWithEmailProvider(
        {
          name: dto.name,
          email: dto.email,
          passwordHash,
          marketingConsent: dto.marketingConsent,
        },
        manager,
      );
    });

    const tokens = this.authService.generateTokens(savedUser);

    return {
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      ...tokens,
    };
  }
}
