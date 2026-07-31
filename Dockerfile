# Build context: repo root (pullim-planner/)
# docker buildx build --platform linux/arm64 -f Dockerfile .
#
# 단일 Next.js 16 앱 (standalone 출력) — bun 빌드 + node 런타임

# ============================================
# Stage 1: builder
# ============================================
FROM oven/bun:1.3.12-debian AS builder
WORKDIR /app

# manifest 먼저 복사 → install layer 캐시 확보
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

ENV NEXT_TELEMETRY_DISABLED=1

# 소스 복사 후 빌드 (standalone 출력)
COPY . .
RUN bun run build

# ============================================
# Stage 2: runner — 최소 런타임
# ============================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3030
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --no-create-home --shell /bin/bash nextjs

# Next.js standalone 출력물 — .next/standalone 에 server.js 와 의존 node_modules 포함
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3030

CMD ["node", "server.js"]
