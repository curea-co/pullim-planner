import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";

import { JwtRefreshStrategy } from "../../common/infrastructure/jwt-refresh.strategy";
import { JwtStrategy } from "../../common/infrastructure/jwt.strategy";
import { PassportTokenProvider } from "../../common/infrastructure/passport-token.provider";
import { TokenProvider } from "../../common/interfaces/token-provider.interface";
import jwtConfig from "../../config/jwt.config";
import { AuthUser } from "../../entities/auth-user.entity";
import { AuthUserProvider } from "../../entities/auth-user-provider.entity";
import { RefreshTokenBlacklist } from "../../entities/refresh-token-blacklist.entity";
import { AuthController } from "./controller/auth.controller";
import { DomainUserProvisioner } from "./identity/domain-user-provisioner";
import { DomainUser } from "./identity/domain-user.entity";
import { AuthUserRepository } from "./infrastructure/auth-user.repository";
import { BlacklistRepository } from "./infrastructure/blacklist.repository";
import { AuthUserRepositoryInterface } from "./interface/auth-user-repository.interface";
import { BlacklistRepositoryInterface } from "./interface/blacklist-repository.interface";
import { AuthService } from "./service/auth.service";
import { AuthUserService } from "./service/auth-user.service";
import { CheckEmailUseCase } from "./use-cases/check-email.use-case";
import { LoginUseCase } from "./use-cases/login.use-case";
import { LogoutUseCase } from "./use-cases/logout.use-case";
import { RefreshUseCase } from "./use-cases/refresh.use-case";
import { SignupUseCase } from "./use-cases/signup.use-case";

/**
 * 인증 모듈 (Phase 0).
 *
 * DatabaseModule 이 `autoLoadEntities: true` 이므로 `forFeature` 등록 엔티티는 루트
 * 연결에 자동 합류한다. `DATABASE_ENABLED=true` 일 때만 DatabaseModule 이 import 되므로,
 * 본 모듈 역시 app.module 에서 동일 게이트로 import 한다 (DB 없이는 부팅 불가).
 *
 * Phase 1: 도메인 `users`(Drizzle 시대 테이블) 를 `DomainUser` 로 매핑해 신원 프로비저닝에
 * 쓴다. synchronize=false 이므로 이 매핑은 스키마를 변경하지 않는다 (읽기/INSERT 전용).
 */
@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
      }),
    }),
    TypeOrmModule.forFeature([
      AuthUser,
      AuthUserProvider,
      RefreshTokenBlacklist,
      DomainUser,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    { provide: TokenProvider, useClass: PassportTokenProvider },
    {
      provide: AuthUserRepositoryInterface,
      useClass: AuthUserRepository,
    },
    {
      provide: BlacklistRepositoryInterface,
      useClass: BlacklistRepository,
    },
    AuthService,
    AuthUserService,
    DomainUserProvisioner,
    JwtStrategy,
    JwtRefreshStrategy,
    SignupUseCase,
    LoginUseCase,
    RefreshUseCase,
    LogoutUseCase,
    CheckEmailUseCase,
  ],
  exports: [AuthService, AuthUserService],
})
export class AuthModule {}
