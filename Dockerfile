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

# NEXT_PUBLIC_* 는 next build 시점에 브라우저 번들에 고정된다. .dockerignore 가 .env* 를
# 이미지에서 제외하므로 이 값들은 오직 --build-arg 로만 주입할 수 있다(시크릿 아닌 공개값만 —
# 실제 값은 레포 루트 .env.example 참고. 이 레포에는 이미지를 빌드하는 CI 워크플로가 아직
# 없으므로 — ci.yml 은 lint/typecheck/test/`next build` 까지만 수행 — 이미지를 빌드하는
# 주체가 환경(local/dev/prod)에 맞는 값을 아래 키로 넘겨야 한다. PR 본문 참고).
ARG NEXT_PUBLIC_PULLIM_API_URL
ARG NEXT_PUBLIC_PULLIM_CSRF_COOKIE
ARG NEXT_PUBLIC_PULLIM_LOGIN_URL
ARG NEXT_PUBLIC_PULLIM_OS_URL
ARG NEXT_PUBLIC_DEV_AUTH_BYPASS
ARG NEXT_PUBLIC_ENABLE_DEV_RESET
ARG NEXT_PUBLIC_ROUTINE_ENABLED
ARG NEXT_PUBLIC_REPORTS_ENABLED
ARG NEXT_PUBLIC_WEAKNESS_ENABLED
ARG NEXT_PUBLIC_NOTIFICATIONS_ENABLED
ARG NEXT_PUBLIC_Q_LINK_ENABLED
ARG NEXT_PUBLIC_REFLECTION_ENABLED
ENV NEXT_PUBLIC_PULLIM_API_URL=$NEXT_PUBLIC_PULLIM_API_URL \
    NEXT_PUBLIC_PULLIM_CSRF_COOKIE=$NEXT_PUBLIC_PULLIM_CSRF_COOKIE \
    NEXT_PUBLIC_PULLIM_LOGIN_URL=$NEXT_PUBLIC_PULLIM_LOGIN_URL \
    NEXT_PUBLIC_PULLIM_OS_URL=$NEXT_PUBLIC_PULLIM_OS_URL \
    NEXT_PUBLIC_DEV_AUTH_BYPASS=$NEXT_PUBLIC_DEV_AUTH_BYPASS \
    NEXT_PUBLIC_ENABLE_DEV_RESET=$NEXT_PUBLIC_ENABLE_DEV_RESET \
    NEXT_PUBLIC_ROUTINE_ENABLED=$NEXT_PUBLIC_ROUTINE_ENABLED \
    NEXT_PUBLIC_REPORTS_ENABLED=$NEXT_PUBLIC_REPORTS_ENABLED \
    NEXT_PUBLIC_WEAKNESS_ENABLED=$NEXT_PUBLIC_WEAKNESS_ENABLED \
    NEXT_PUBLIC_NOTIFICATIONS_ENABLED=$NEXT_PUBLIC_NOTIFICATIONS_ENABLED \
    NEXT_PUBLIC_Q_LINK_ENABLED=$NEXT_PUBLIC_Q_LINK_ENABLED \
    NEXT_PUBLIC_REFLECTION_ENABLED=$NEXT_PUBLIC_REFLECTION_ENABLED

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
