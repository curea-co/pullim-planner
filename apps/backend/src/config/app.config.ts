import { registerAs } from "@nestjs/config";
import { Environment } from "../common/constants/environment.constant";

export default registerAs("app", () => {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3030";

  // `https://a.com, https://b.com` 처럼 공백이 섞인 흔한 env 값에서도
  // 각 origin 을 trim 하고 빈 문자열을 제거한다 (codex R6 지적).
  const corsOrigin = process.env.CORS_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return {
    nodeEnv: process.env.NODE_ENV ?? Environment.DEVELOPMENT,
    frontendUrl,
    // `CORS_ORIGIN` 미지정 시 하드코딩된 기본값 대신 `frontendUrl` 을 재사용한다.
    // 배포 환경에서 `FRONTEND_URL` 만 바꾸고 `CORS_ORIGIN` 을 빼면 모든 요청이
    // localhost 기준으로 CORS 차단되던 문제를 막는다 (codex R8 지적).
    corsOrigin:
      corsOrigin && corsOrigin.length > 0 ? corsOrigin : [frontendUrl],
    trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS ?? "0", 10),
  };
});
