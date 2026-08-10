import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker prod 컨테이너용 standalone 출력 — .next/standalone에 server.js 생성
  output: "standalone",
  // [로컬 SSO] planner.pullim.local:3006 로컬 서브도메인 SSO 검증용 — Next dev cross-origin 리소스(HMR/chunks) 차단 해제.
  // dev 전용(allowedDevOrigins는 prod 빌드에 영향 없음). 로컬 SSO 안 쓰면 불필요.
  allowedDevOrigins: ["planner.pullim.local", "pullim.local"],
};

export default nextConfig;
