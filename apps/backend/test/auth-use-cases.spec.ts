/*
 * jest mock 객체의 메서드를 `expect(mock.method)` 로 단언하는 패턴은 `this` 바인딩이
 * 의미가 없으므로 unbound-method 규칙을 이 spec 파일 한정으로 끈다 (jest 표준 패턴).
 */
/* eslint-disable @typescript-eslint/unbound-method */
import "reflect-metadata";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

import { hashText, verifyHash } from "../src/common/utils/crypto.util";
import { getCurrentUserId } from "../src/common/utils/request.util";
import { DEFAULT_MOCK_USER_ID } from "../src/common/constants/auth.constant";
import { ErrorMessages } from "../src/common/constants/error-messages.constant";
import { MAX_LOGIN_ATTEMPTS } from "../src/common/constants/security.constant";
import { AuthService } from "../src/modules/auth/service/auth.service";
import { AuthUserService } from "../src/modules/auth/service/auth-user.service";
import { SignupUseCase } from "../src/modules/auth/use-cases/signup.use-case";
import { LoginUseCase } from "../src/modules/auth/use-cases/login.use-case";
import { RefreshUseCase } from "../src/modules/auth/use-cases/refresh.use-case";
import { LogoutUseCase } from "../src/modules/auth/use-cases/logout.use-case";
import { CheckEmailUseCase } from "../src/modules/auth/use-cases/check-email.use-case";
import { UserRole } from "../src/entities/enums/user-role.enum";
import { AuthProvider } from "../src/entities/enums/auth-provider.enum";
import type { AuthUser } from "../src/entities/auth-user.entity";
import type { AuthUserProvider } from "../src/entities/auth-user-provider.entity";
import type { TokenProvider } from "../src/common/interfaces/token-provider.interface";
import type { BlacklistRepositoryInterface } from "../src/modules/auth/interface/blacklist-repository.interface";
import type { AuthUserRepositoryInterface } from "../src/modules/auth/interface/auth-user-repository.interface";
import { plainToInstance } from "class-transformer";
import type { ConfigType } from "@nestjs/config";
import { JwtStrategy } from "../src/common/infrastructure/jwt.strategy";
import { JwtRefreshStrategy } from "../src/common/infrastructure/jwt-refresh.strategy";
import {
  JWT_TYPE_ACCESS,
  JWT_TYPE_REFRESH,
} from "../src/common/constants/jwt.constant";
import jwtConfig from "../src/config/jwt.config";
import { SignupDto } from "../src/modules/auth/controller/dto/signup.dto";
import { LoginDto } from "../src/modules/auth/controller/dto/login.dto";
import { CheckEmailQueryDto } from "../src/modules/auth/controller/dto/check-email-query.dto";

/**
 * auth Phase 0+1 UseCase / Service 단위 테스트.
 *
 * 실제 DB·HTTP·NestJS 컨테이너 없이 의존성을 jest mock 으로 주입해 인증 핵심 로직을 고정한다.
 * 검증 범위 (PR #40):
 * - signup: bcrypt+pepper 해시, 비밀번호 확인 불일치, 이메일 중복 거절, 도메인 신원 프로비저닝
 * - login: 잘못된 비밀번호 거절(+실패 카운트 증가), 성공 시 access+refresh 발급
 * - refresh: rotation(새 토큰 발급), 재사용/블랙리스트 토큰 거절
 * - check-email: 사용 가능/불가 판정
 * - getCurrentUserId resolver: 세션 유무에 따른 id 해석
 */

const PEPPER = "test-pepper-for-unit-spec";

/** PASSWORD_PEPPER 만 제공하는 ConfigService mock. */
function makeConfigService(): ConfigService {
  return {
    getOrThrow: (key: string) => {
      if (key === "PASSWORD_PEPPER") return PEPPER;
      throw new Error(`unexpected config key: ${key}`);
    },
  } as unknown as ConfigService;
}

/** access/refresh 토큰 쌍을 고정값으로 돌려주는 TokenProvider mock. */
function makeTokenProvider(): jest.Mocked<TokenProvider> {
  return {
    generateTokens: jest.fn().mockReturnValue({
      accessToken: "access.jwt.token",
      refreshToken: "refresh.jwt.token",
    }),
  };
}

function makeAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "user-uuid-1",
    name: "홍길동",
    email: "user@example.com",
    role: UserRole.USER,
    authProviders: [],
    ...overrides,
  } as AuthUser;
}

function makeEmailProvider(
  overrides: Partial<AuthUserProvider> = {},
): AuthUserProvider {
  return {
    provider: AuthProvider.EMAIL,
    password: "hashed-password",
    failedLoginCount: 0,
    lockedAt: null,
    ...overrides,
  } as unknown as AuthUserProvider;
}

describe("crypto.util — bcrypt + pepper 해싱", () => {
  it("hashText 는 평문과 다른 bcrypt 해시를 생성하고 verifyHash 로 검증된다", async () => {
    const hash = await hashText("Sup3r$ecret!", PEPPER);
    expect(hash).not.toBe("Sup3r$ecret!");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix
    expect(await verifyHash("Sup3r$ecret!", hash, PEPPER)).toBe(true);
  });

  it("틀린 비밀번호는 검증에 실패한다", async () => {
    const hash = await hashText("Sup3r$ecret!", PEPPER);
    expect(await verifyHash("wrong-password", hash, PEPPER)).toBe(false);
  });

  it("pepper 가 다르면 같은 평문도 검증에 실패한다 (pepper 가 해시에 반영됨)", async () => {
    const hash = await hashText("Sup3r$ecret!", PEPPER);
    expect(await verifyHash("Sup3r$ecret!", hash, "different-pepper")).toBe(
      false,
    );
  });
});

describe("SignupUseCase", () => {
  let authUserService: jest.Mocked<AuthUserService>;
  let authService: AuthService;
  let provisioner: { provision: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let blacklistRepository: jest.Mocked<BlacklistRepositoryInterface>;
  let useCase: SignupUseCase;

  const baseDto = {
    name: "홍길동",
    email: "new@example.com",
    password: "Sup3r$ecret!",
    passwordConfirm: "Sup3r$ecret!",
    marketingConsent: true,
  };

  beforeEach(() => {
    blacklistRepository = {
      add: jest.fn(),
      exists: jest.fn(),
    };

    authService = new AuthService(
      makeConfigService(),
      makeTokenProvider(),
      blacklistRepository,
    );

    authUserService = {
      validateEmailUniqueness: jest.fn().mockResolvedValue(undefined),
      createWithEmailProvider: jest.fn(),
    } as unknown as jest.Mocked<AuthUserService>;

    provisioner = { provision: jest.fn().mockResolvedValue(undefined) };

    // transaction(cb) 는 cb 에 가짜 manager 를 넘겨 그대로 실행한다.
    dataSource = {
      transaction: jest.fn((cb: (m: unknown) => unknown) =>
        Promise.resolve(cb({})),
      ),
    };

    useCase = new SignupUseCase(
      dataSource as never,
      authUserService,
      authService,
      provisioner,
    );
  });

  it("비밀번호 확인이 일치하지 않으면 BadRequestException 을 던진다", async () => {
    await expect(
      useCase.execute({ ...baseDto, passwordConfirm: "mismatch" }),
    ).rejects.toThrow(BadRequestException);
    expect(authUserService.createWithEmailProvider).not.toHaveBeenCalled();
  });

  it("이메일이 중복이면 ConflictException 을 전파한다", async () => {
    authUserService.validateEmailUniqueness.mockRejectedValueOnce(
      new ConflictException(ErrorMessages.USER_EMAIL_DUPLICATED),
    );
    await expect(useCase.execute(baseDto)).rejects.toThrow(ConflictException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it("성공 시 비밀번호를 bcrypt 해시하고, 도메인 신원을 같은 트랜잭션에서 프로비저닝하고, 토큰을 반환한다", async () => {
    const savedUser = makeAuthUser({
      id: "user-uuid-1",
      email: baseDto.email,
      name: baseDto.name,
    });
    authUserService.createWithEmailProvider.mockResolvedValue(savedUser);

    const result = await useCase.execute(baseDto);

    // 해시: createWithEmailProvider 로 넘어간 passwordHash 가 평문이 아니고 verify 가능해야 한다.
    const createArg = authUserService.createWithEmailProvider.mock.calls[0][0];
    expect(createArg.passwordHash).not.toBe(baseDto.password);
    expect(
      await verifyHash(baseDto.password, createArg.passwordHash, PEPPER),
    ).toBe(true);

    // 신원 프로비저닝이 auth_user.id 와 동일 id 로 호출됐는지.
    expect(provisioner.provision).toHaveBeenCalledWith(
      { id: savedUser.id, name: savedUser.name },
      expect.anything(),
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      id: savedUser.id,
      email: savedUser.email,
      role: UserRole.USER,
      accessToken: "access.jwt.token",
      refreshToken: "refresh.jwt.token",
    });
  });
});

describe("LoginUseCase", () => {
  let authUserService: jest.Mocked<AuthUserService>;
  let authService: AuthService;
  let useCase: LoginUseCase;
  let passwordHash: string;

  const dto = { email: "user@example.com", password: "Sup3r$ecret!" };

  beforeEach(async () => {
    passwordHash = await hashText(dto.password, PEPPER);

    authService = new AuthService(makeConfigService(), makeTokenProvider(), {
      add: jest.fn(),
    } as unknown as BlacklistRepositoryInterface);

    authUserService = {
      findByEmailWithProviders: jest.fn(),
      incrementFailedLoginCount: jest.fn().mockResolvedValue(undefined),
      resetFailedLoginCount: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuthUserService>;

    useCase = new LoginUseCase(authUserService, authService);
  });

  it("존재하지 않는 이메일은 UnauthorizedException(로그인 실패) 으로 거절한다", async () => {
    authUserService.findByEmailWithProviders.mockResolvedValue(null);
    await expect(useCase.execute(dto)).rejects.toThrow(UnauthorizedException);
  });

  it("잘못된 비밀번호는 거절하고 실패 카운트를 증가시킨다", async () => {
    const user = makeAuthUser({
      authProviders: [makeEmailProvider({ password: passwordHash })],
    });
    authUserService.findByEmailWithProviders.mockResolvedValue(user);

    await expect(
      useCase.execute({ ...dto, password: "wrong-password" }),
    ).rejects.toThrow(UnauthorizedException);

    expect(authUserService.incrementFailedLoginCount).toHaveBeenCalledWith(
      user.id,
      MAX_LOGIN_ATTEMPTS,
    );
    expect(authUserService.resetFailedLoginCount).not.toHaveBeenCalled();
  });

  it("잠긴 계정은 ForbiddenException 으로 거절한다", async () => {
    const user = makeAuthUser({
      authProviders: [
        makeEmailProvider({
          password: passwordHash,
          lockedAt: new Date() as never,
        }),
      ],
    });
    authUserService.findByEmailWithProviders.mockResolvedValue(user);

    await expect(useCase.execute(dto)).rejects.toThrow(ForbiddenException);
  });

  it("성공 시 실패 카운트를 초기화하고 access+refresh 토큰을 반환한다", async () => {
    const user = makeAuthUser({
      authProviders: [makeEmailProvider({ password: passwordHash })],
    });
    authUserService.findByEmailWithProviders.mockResolvedValue(user);

    const result = await useCase.execute(dto);

    expect(authUserService.resetFailedLoginCount).toHaveBeenCalledWith(user.id);
    expect(authUserService.incrementFailedLoginCount).not.toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: "access.jwt.token",
      refreshToken: "refresh.jwt.token",
    });
  });
});

describe("RefreshUseCase — rotation", () => {
  let authService: AuthService;
  let blacklistRepository: jest.Mocked<BlacklistRepositoryInterface>;
  let useCase: RefreshUseCase;

  const oldRefreshToken = "old.refresh.token";

  beforeEach(() => {
    blacklistRepository = {
      add: jest.fn(),
    } as unknown as jest.Mocked<BlacklistRepositoryInterface>;

    authService = new AuthService(
      makeConfigService(),
      makeTokenProvider(),
      blacklistRepository,
    );

    useCase = new RefreshUseCase(authService);
  });

  it("미사용 refresh 토큰이면 블랙리스트에 등록(rotation)하고 새 토큰 쌍을 발급한다", async () => {
    blacklistRepository.add.mockResolvedValue(true); // wasNew = true
    const user = makeAuthUser();

    const result = await useCase.execute(user, oldRefreshToken);

    expect(blacklistRepository.add).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      accessToken: "access.jwt.token",
      refreshToken: "refresh.jwt.token",
    });
  });

  it("이미 사용된(블랙리스트) refresh 토큰은 UnauthorizedException 으로 거절하고 새 토큰을 발급하지 않는다", async () => {
    blacklistRepository.add.mockResolvedValue(false); // wasNew = false → 재사용
    const user = makeAuthUser();
    const tokenProvider = (
      authService as unknown as { tokenProvider: { generateTokens: jest.Mock } }
    ).tokenProvider;

    await expect(useCase.execute(user, oldRefreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
    // 재사용 토큰은 새 토큰을 발급하지 않아야 한다 (rotation 동시 재사용 차단).
    expect(tokenProvider.generateTokens).not.toHaveBeenCalled();
  });
});

describe("LogoutUseCase — 토큰 무효화", () => {
  let authService: AuthService;
  let blacklistRepository: jest.Mocked<BlacklistRepositoryInterface>;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    blacklistRepository = {
      add: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<BlacklistRepositoryInterface>;

    authService = new AuthService(
      makeConfigService(),
      makeTokenProvider(),
      blacklistRepository,
    );

    useCase = new LogoutUseCase(authService);
  });

  it("refresh 토큰을 블랙리스트에 등록해 무효화한다", async () => {
    // jti 가 있는 최소 JWT (header.payload.signature) — payload 에 jti·exp 포함.
    const payload = Buffer.from(
      JSON.stringify({ jti: "rt-jti-123", exp: 9999999999 }),
    ).toString("base64url");
    const refreshToken = `h.${payload}.s`;

    await useCase.execute(refreshToken);

    expect(blacklistRepository.add).toHaveBeenCalledTimes(1);
    // 추출된 tokenId(jti)로 블랙리스트에 등록돼야 한다.
    expect(blacklistRepository.add.mock.calls[0][0]).toBe("rt-jti-123");
  });
});

describe("CheckEmailUseCase", () => {
  it("사용 가능한 이메일은 available=true 를 반환한다", async () => {
    const authUserService = {
      isEmailAvailable: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<AuthUserService>;
    const useCase = new CheckEmailUseCase(authUserService);

    await expect(useCase.execute("free@example.com")).resolves.toEqual({
      available: true,
    });
  });

  it("이미 사용 중인 이메일은 available=false 를 반환한다", async () => {
    const authUserService = {
      isEmailAvailable: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<AuthUserService>;
    const useCase = new CheckEmailUseCase(authUserService);

    await expect(useCase.execute("taken@example.com")).resolves.toEqual({
      available: false,
    });
  });
});

describe("AuthUserService — 이메일 검증", () => {
  function makeService(
    repoOverrides: Partial<AuthUserRepositoryInterface> = {},
  ): AuthUserService {
    const repo = {
      existsByEmail: jest.fn(),
      ...repoOverrides,
    } as unknown as AuthUserRepositoryInterface;
    return new AuthUserService(repo);
  }

  it("validateEmailUniqueness 는 중복 이메일에 ConflictException 을 던진다", async () => {
    const service = makeService({
      existsByEmail: jest.fn().mockResolvedValue(true),
    });
    await expect(
      service.validateEmailUniqueness("dup@example.com"),
    ).rejects.toThrow(ConflictException);
  });

  it("isEmailAvailable 은 존재 여부의 반대를 반환한다", async () => {
    const taken = makeService({
      existsByEmail: jest.fn().mockResolvedValue(true),
    });
    const free = makeService({
      existsByEmail: jest.fn().mockResolvedValue(false),
    });
    await expect(taken.isEmailAvailable("x@example.com")).resolves.toBe(false);
    await expect(free.isEmailAvailable("y@example.com")).resolves.toBe(true);
  });
});

describe("getCurrentUserId resolver", () => {
  it("세션(req.user.id) 이 있으면 그 id 를 반환한다", () => {
    const req = { user: { id: "user-uuid-1" } } as never;
    expect(getCurrentUserId(req)).toBe("user-uuid-1");
  });

  it("세션이 없으면 데모 폴백(student_001) 을 반환한다", () => {
    expect(getCurrentUserId({} as never)).toBe(DEFAULT_MOCK_USER_ID);
    expect(getCurrentUserId({ user: undefined } as never)).toBe(
      DEFAULT_MOCK_USER_ID,
    );
  });
});

describe("이메일 정규화 (DTO @NormalizeEmail)", () => {
  it("signup/login/check-email DTO 모두 trim + lowercase 로 정규화한다", () => {
    const raw = "  A.User@Example.COM ";
    const normalized = "a.user@example.com";

    const signup = plainToInstance(SignupDto, {
      name: "홍길동",
      email: raw,
      password: "Sup3r$ecret!",
      passwordConfirm: "Sup3r$ecret!",
    });
    const login = plainToInstance(LoginDto, { email: raw, password: "x" });
    const check = plainToInstance(CheckEmailQueryDto, { email: raw });

    expect(signup.email).toBe(normalized);
    expect(login.email).toBe(normalized);
    expect(check.email).toBe(normalized);
  });

  it("대소문자만 다른 두 이메일이 같은 값으로 정규화돼 중복 가입을 막는다", () => {
    const a = plainToInstance(SignupDto, {
      name: "a",
      email: "Dup@X.com",
      password: "Sup3r$ecret!",
      passwordConfirm: "Sup3r$ecret!",
    });
    const b = plainToInstance(LoginDto, { email: "dup@x.COM", password: "x" });
    expect(a.email).toBe(b.email);
  });
});

describe("JWT type 클레임 교차 검증", () => {
  const jwt = { secret: "test-secret" } as ConfigType<typeof jwtConfig>;

  function makeUserService(): AuthUserService {
    return {
      findByIdOrFail: jest.fn().mockResolvedValue(makeAuthUser()),
    } as unknown as AuthUserService;
  }

  it("access 전략은 refresh 타입 토큰을 거절한다", async () => {
    const strategy = new JwtStrategy(jwt, makeUserService());
    await expect(
      strategy.validate({ sub: "user-uuid-1", type: JWT_TYPE_REFRESH }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("access 전략은 type 클레임이 없는 토큰도 거절한다", async () => {
    const strategy = new JwtStrategy(jwt, makeUserService());
    await expect(strategy.validate({ sub: "user-uuid-1" })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("access 전략은 정상 access 토큰을 통과시킨다", async () => {
    const strategy = new JwtStrategy(jwt, makeUserService());
    await expect(
      strategy.validate({ sub: "user-uuid-1", type: JWT_TYPE_ACCESS }),
    ).resolves.toBeDefined();
  });

  it("refresh 전략은 access 타입 토큰을 거절한다", async () => {
    const strategy = new JwtRefreshStrategy(jwt, makeUserService());
    const req = {
      headers: { authorization: "Bearer h.p.s" },
    } as never;
    await expect(
      strategy.validate(req, { sub: "user-uuid-1", type: JWT_TYPE_ACCESS }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("refresh 전략은 type 클레임이 없는 토큰도 거절한다", async () => {
    const strategy = new JwtRefreshStrategy(jwt, makeUserService());
    const req = {
      headers: { authorization: "Bearer h.p.s" },
    } as never;
    await expect(
      strategy.validate(req, { sub: "user-uuid-1" }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

describe("CreateDomainUsersTable 마이그레이션 — fresh DB 가입 경로", () => {
  it("up() 이 도메인 users 테이블을 IF NOT EXISTS 로 생성한다 (운영 DB 무손상)", async () => {
    const { CreateDomainUsersTable1748735000000 } =
      (await import("../src/database/migrations/1748735000000-CreateDomainUsersTable")) as {
        CreateDomainUsersTable1748735000000: new () => {
          up: (qr: { query: (sql: string) => Promise<void> }) => Promise<void>;
        };
      };

    const queries: string[] = [];
    const queryRunner = {
      query: (sql: string) => {
        queries.push(sql);
        return Promise.resolve();
      },
    };

    await new CreateDomainUsersTable1748735000000().up(queryRunner);

    const joined = queries.join("\n");
    // fresh DB 에 users 가 없으면 만들고, 운영 DB(Drizzle 시대)에 있으면 건드리지 않는다.
    expect(joined).toContain('CREATE TABLE IF NOT EXISTS "users"');
    // DomainUserProvisioner 가 INSERT 하는 NOT NULL 컬럼이 모두 정의돼 있어야
    // fresh DB 가입이 롤백되지 않는다 (PR#40 회귀 방지).
    expect(joined).toContain('"id" text NOT NULL');
    expect(joined).toContain('PRIMARY KEY ("id")');
    expect(joined).toContain('"focus_subjects" text[] NOT NULL');
    expect(joined).toContain('"weekly_hours" integer NOT NULL');
    expect(joined).toContain('"preferred_study_time" text NOT NULL');
    // joined_at 은 timezone 없는 timestamp (레거시 컬럼 타입 정합).
    expect(joined).toMatch(/"joined_at" timestamp NOT NULL/);
  });

  it("타임스탬프 prefix 가 auth 마이그레이션보다 앞서 users 가 먼저 존재한다", () => {
    // 1748735000000(users) < 1748736000000(auth) — 가입 경로 전에 users 생성 보장.
    expect(1748735000000).toBeLessThan(1748736000000);
  });
});

describe("CreateAuthTables 마이그레이션 — fresh DB 안전성", () => {
  it("up() 이 gen_random_uuid() 의존을 위해 pgcrypto 확장을 보장한다", async () => {
    const { CreateAuthTables1748736000000 } =
      (await import("../src/database/migrations/1748736000000-CreateAuthTables")) as {
        CreateAuthTables1748736000000: new () => {
          up: (qr: { query: (sql: string) => Promise<void> }) => Promise<void>;
        };
      };

    const queries: string[] = [];
    const queryRunner = {
      query: (sql: string) => {
        queries.push(sql);
        return Promise.resolve();
      },
    };

    await new CreateAuthTables1748736000000().up(queryRunner);

    const joined = queries.join("\n");
    expect(joined).toContain('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    // 확장 생성이 gen_random_uuid() 첫 사용보다 먼저 실행돼야 한다.
    const extIdx = queries.findIndex((q) => q.includes("pgcrypto"));
    const uuidIdx = queries.findIndex((q) => q.includes("gen_random_uuid"));
    expect(extIdx).toBeGreaterThanOrEqual(0);
    expect(extIdx).toBeLessThan(uuidIdx);
  });
});
