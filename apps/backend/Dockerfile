# Build context: monorepo root (pullim-planner/)
# docker build -f apps/backend/Dockerfile -t pullim-planner-backend .
#
# apps/planner/Dockerfile 패턴 차용 — bun + workspace 빌드, node 런타임.
# backend 는 @pullim-planner/* 워크스페이스 의존성이 없어 self-contained 하다.

# ============================================
# Stage 1: builder
# ============================================
FROM oven/bun:1.3.12-debian AS builder
WORKDIR /app

# manifest 먼저 복사 → install layer 캐시 확보.
# bun workspace 의 frozen lockfile 은 모든 멤버(planner 포함) manifest 가 있어야
# 그래프가 lockfile 과 일치한다. 누락 시 "lockfile had changes" 로 실패한다.
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/planner/package.json ./apps/planner/
COPY packages ./packages
RUN bun install --frozen-lockfile --filter @pullim-planner/backend

# 모노레포 공용 base tsconfig — 현재 apps/backend/tsconfig.json 은 self-contained 라
# extends 하지 않지만, 향후 base 확장 시 빌드가 깨지지 않도록 방어적으로 포함한다
# (빌드 입력 완결성). codex 지적 반영.
COPY tsconfig.base.json ./

# 소스 복사 후 nest build (→ apps/backend/dist)
COPY apps/backend ./apps/backend
RUN bun --filter @pullim-planner/backend build

# ============================================
# Stage 2: runner — 최소 런타임
# ============================================
FROM node:22-bookworm-slim AS runner
# cwd = backend 앱 루트. data-source/typeorm 의 migrations glob 이
# "dist/database/migrations/**/*.js" 상대 경로라 cwd 가 여기여야 마이그레이션이 잡힌다.
WORKDIR /app/apps/backend

ENV NODE_ENV=production
# 호스팅 플랫폼이 $PORT 를 주입하면 그 값을, 없으면 4030.
ENV PORT=4030

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --no-create-home --shell /bin/bash nestjs

# bun 의존성 레이아웃: 실제 패키지는 루트의 중앙 스토어 /app/node_modules/.bun 에 있고,
# 멤버(/app/apps/backend/node_modules)는 그 스토어로의 심링크 농장이다.
# 따라서 둘 다 복사해야 심링크가 깨지지 않는다.
# node 모듈 해석은 dist/main.js 기준 상위로 올라가며 ./node_modules → /app/node_modules 를 찾는다.
# (bcrypt 등 네이티브 모듈: builder(oven/bun debian, glibc) → runner(debian slim, glibc) 호환)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./package.json

USER nestjs
EXPOSE 4030

CMD ["node", "dist/main"]
