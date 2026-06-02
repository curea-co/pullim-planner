import { registerAs } from "@nestjs/config";

import {
  DECIMAL_RADIX,
  DEFAULT_JWT_EXPIRATION,
  DEFAULT_JWT_REFRESH_EXPIRATION,
} from "../common/constants/jwt.constant";

/**
 * JWT ConfigService 네임스페이스.
 *
 * `secret` 은 access/refresh 토큰 서명에 공유한다 (타입은 payload `type` 으로 분리).
 * 만료(초)는 env 로 override 가능. 본 config 는 `JwtModule`·`Jwt(Refresh)Strategy`·
 * `PassportTokenProvider` 가 `ConfigType<typeof jwtConfig>` 로 주입받는다.
 *
 * `JWT_SECRET` 은 `AppConfigModule` 의 Joi 스키마가 부팅 시 강제하므로 여기서는
 * 존재를 가정하되, CLI/테스트 경로 등 ConfigModule 밖에서의 호출에 대비해 방어한다.
 */
export default registerAs("jwt", () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET 환경변수가 설정되지 않았습니다");
  }

  return {
    secret,
    expiration: parseInt(
      process.env.JWT_EXPIRATION ?? String(DEFAULT_JWT_EXPIRATION),
      DECIMAL_RADIX,
    ),
    refreshExpiration: parseInt(
      process.env.JWT_REFRESH_EXPIRATION ??
        String(DEFAULT_JWT_REFRESH_EXPIRATION),
      DECIMAL_RADIX,
    ),
  };
});
