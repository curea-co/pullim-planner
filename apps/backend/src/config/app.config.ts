import { registerAs } from "@nestjs/config";
import { Environment } from "../common/constants/environment.constant";

export default registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV ?? Environment.DEVELOPMENT,
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3030",
  // `https://a.com, https://b.com` 처럼 공백이 섞인 흔한 env 값에서도
  // 각 origin 을 trim 하고 빈 문자열을 제거한다 (codex R6 지적).
  corsOrigin: process.env.CORS_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0) ?? ["http://localhost:3030"],
  trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS ?? "0", 10),
}));
