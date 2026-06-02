import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import { ErrorMessages } from "../../../common/constants/error-messages.constant";
import { UserRole } from "../../../entities/enums/user-role.enum";
import { SignupDto } from "../controller/dto/signup.dto";
import { DomainUserProvisioner } from "../identity/domain-user-provisioner";
import { AuthService } from "../service/auth.service";
import { AuthUserService } from "../service/auth-user.service";

/**
 * 이메일 회원가입 UseCase (Facade). 비밀번호 확인 → 이메일 중복 검증 → 해시 →
 * 사용자+EMAIL 제공자 생성 → **도메인 users 신원 프로비저닝**(Phase 1) → 토큰 발급을 조합한다.
 * 인증 사용자와 도메인 사용자 생성은 한 트랜잭션으로 묶어 원자성을 보장한다.
 */
@Injectable()
export class SignupUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly authUserService: AuthUserService,
    private readonly authService: AuthService,
    private readonly domainUserProvisioner: DomainUserProvisioner,
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
      const user = await this.authUserService.createWithEmailProvider(
        {
          name: dto.name,
          email: dto.email,
          passwordHash,
          marketingConsent: dto.marketingConsent,
        },
        manager,
      );
      // 신원 단일화: 도메인 users 행을 id = auth_user.id 로 같은 트랜잭션에서 생성.
      await this.domainUserProvisioner.provision(
        { id: user.id, name: user.name },
        manager,
      );
      return user;
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
