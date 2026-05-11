import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker prod 컨테이너용 standalone 출력 — .next/standalone에 server.js 생성
  output: "standalone",
  // Claude 세션 전용 빌드 디렉토리 — 유저의 .next 캐시와 격리
  distDir: ".next-claude",
};

export default nextConfig;
