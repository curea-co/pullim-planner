import { registerAs } from "@nestjs/config";
import { Environment } from "../common/constants/environment.constant";

export default registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV ?? Environment.DEVELOPMENT,
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3030",
  corsOrigin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3030"],
  trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS ?? "0", 10),
}));
