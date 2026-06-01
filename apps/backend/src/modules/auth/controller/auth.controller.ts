import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { Public } from "../../../common/decorators/public.decorator";
import { JwtRefreshGuard } from "../../../common/guards/jwt-refresh.guard";
import type { AuthUser } from "../../../entities/auth-user.entity";
import { CheckEmailQueryDto } from "./dto/check-email-query.dto";
import { LoginDto } from "./dto/login.dto";
import { LogoutDto } from "./dto/logout.dto";
import { MeResponseDto } from "./dto/me-response.dto";
import { SignupDto } from "./dto/signup.dto";
import { SignupResponseDto } from "./dto/signup-response.dto";
import { TokenResponseDto } from "./dto/token-response.dto";
import { CheckEmailUseCase } from "../use-cases/check-email.use-case";
import { LoginUseCase } from "../use-cases/login.use-case";
import { LogoutUseCase } from "../use-cases/logout.use-case";
import { RefreshUseCase } from "../use-cases/refresh.use-case";
import { SignupUseCase } from "../use-cases/signup.use-case";

/**
 * 이메일·비밀번호 인증 컨트롤러.
 *
 * 응답은 전역 `ResponseInterceptor` 가 `{ success, data }` 로 감싸므로 핸들러는 순수
 * DTO 만 반환한다. `signup/login/refresh/check-email` 은 `@Public()` (전역 JwtAuthGuard 면제),
 * `logout/me` 는 access token 필요.
 */
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly signupUseCase: SignupUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly checkEmailUseCase: CheckEmailUseCase,
  ) {}

  @Public()
  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "이메일 회원가입" })
  async signup(@Body() dto: SignupDto): Promise<SignupResponseDto> {
    const result = await this.signupUseCase.execute(dto);
    return SignupResponseDto.from(result);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "이메일 로그인" })
  async login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    const tokens = await this.loginUseCase.execute(dto);
    return TokenResponseDto.from(tokens);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh Token 으로 새 토큰 쌍 발급" })
  async refresh(
    @CurrentUser() currentUser: { user: AuthUser; refreshToken: string },
  ): Promise<TokenResponseDto> {
    const tokens = await this.refreshUseCase.execute(
      currentUser.user,
      currentUser.refreshToken,
    );
    return TokenResponseDto.from(tokens);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "로그아웃 (Refresh Token 블랙리스트 등록)" })
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.logoutUseCase.execute(dto.refreshToken);
  }

  @Public()
  @Get("check-email")
  @ApiOperation({ summary: "이메일 중복 여부 확인" })
  async checkEmail(
    @Query() query: CheckEmailQueryDto,
  ): Promise<{ available: boolean }> {
    return this.checkEmailUseCase.execute(query.email);
  }

  @Get("me")
  @ApiOperation({ summary: "현재 인증 사용자 정보 (access token 필요)" })
  me(@CurrentUser() user: AuthUser): MeResponseDto {
    return MeResponseDto.from(user);
  }
}
