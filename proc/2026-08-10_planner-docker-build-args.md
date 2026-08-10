# Docker 이미지 빌드 — NEXT_PUBLIC_* build-arg 가이드

작성 2026-08-10 · 목적: `Dockerfile` 로 이미지를 수동 빌드하는 사람이 `NEXT_PUBLIC_*` 12개를 빠짐없이 올바르게 넘기도록. PR #195 리뷰(runner 스테이지 서버 런타임 누락) 반영 과정에서 README.md 대신 이 문서로 옮김(루트 `CLAUDE.md` "수정 금지 영역"에 README.md 포함 — 컨벤션 변경은 별도 작업으로).

> SoT 성격: 이 문서는 운영 가이드다. `NEXT_PUBLIC_*` 키 목록·의미의 SoT 는 `.env.example`.

## 배경

`Dockerfile` 은 있지만(standalone 출력, `docker buildx build`) **이 레포에는 아직 이미지를 빌드·푸시하는 CI 워크플로가 없다**(`.github/workflows/ci.yml` 은 lint/typecheck/test/`next build` 까지만 — dev 배포는 Vercel). 수동으로 이미지를 빌드하는 주체는 `next build` 가 브라우저 번들에 굽는 `NEXT_PUBLIC_*` 값을 **반드시 `--build-arg` 로 전달**해야 한다(`.dockerignore` 가 `.env*` 를 제외해 이미지 안엔 로컬 값이 없음).

## 키 성격 — 12개 중 2개는 서버 런타임에서도 읽힌다

`NEXT_PUBLIC_*` 12개는 성격이 둘로 갈린다(2026-08-10 grep 실측, PR #195 리뷰 반영):

- **브라우저 번들 전용(10개)** — `PULLIM_API_URL`·`PULLIM_CSRF_COOKIE`·`PULLIM_LOGIN_URL`·`PULLIM_OS_URL`·`DEV_AUTH_BYPASS`·`ENABLE_DEV_RESET`·`WEAKNESS_ENABLED`·`NOTIFICATIONS_ENABLED`·`Q_LINK_ENABLED`·`REFLECTION_ENABLED`. 전부 `'use client'` 컴포넌트에서만 읽힌다 — `next build` 시점에 브라우저 JS 에 값이 고정되고, **컨테이너 런타임에 env 를 넣어도 이미 구워진 브라우저 코드엔 반영되지 않는다.**
- **브라우저 번들 + 서버 런타임 둘 다(2개)** — `NEXT_PUBLIC_ROUTINE_ENABLED`·`NEXT_PUBLIC_REPORTS_ENABLED`. `lib/flags.ts` 를 거쳐 `app/(student)/planner/routine/*`·`reports/page.tsx` **Server Component** 가 모듈 스코프에서 직접 읽어 `redirect` 게이트에 쓴다 — 즉 `server.js` 프로세스 자체가 이 두 값을 참조한다. `Dockerfile` 의 `runner` 스테이지도 같은 `--build-arg` 값을 `ENV` 로 다시 실어서(빌드타임 고정 + 서버 런타임 둘 다 커버) 브라우저 번들 값과 서버 게이트 값이 어긋나지 않게 한다 — 이 두 키는 `builder`/`runner` 양쪽에 **같은 값**을 넘겨야 한다(다르게 넘기면 클라이언트 UI 와 서버 redirect 판정이 갈린다).

## 빌드 예시

```bash
docker buildx build --platform linux/arm64 -f Dockerfile \
  --build-arg NEXT_PUBLIC_PULLIM_API_URL=https://dev-api.pullim.ai \
  --build-arg NEXT_PUBLIC_PULLIM_CSRF_COOKIE=dev-pullim-csrf \
  --build-arg NEXT_PUBLIC_PULLIM_LOGIN_URL=<환경별 로그인 host> \
  --build-arg NEXT_PUBLIC_PULLIM_OS_URL=<환경별 OS host> \
  --build-arg NEXT_PUBLIC_DEV_AUTH_BYPASS=0 \
  --build-arg NEXT_PUBLIC_ENABLE_DEV_RESET=false \
  --build-arg NEXT_PUBLIC_ROUTINE_ENABLED=1 \
  --build-arg NEXT_PUBLIC_REPORTS_ENABLED=1 \
  --build-arg NEXT_PUBLIC_WEAKNESS_ENABLED=1 \
  --build-arg NEXT_PUBLIC_NOTIFICATIONS_ENABLED=1 \
  --build-arg NEXT_PUBLIC_Q_LINK_ENABLED=1 \
  --build-arg NEXT_PUBLIC_REFLECTION_ENABLED=1 \
  .
```

값 설명은 `.env.example`. 시크릿(비-`NEXT_PUBLIC_*`)은 build arg 로 넘기지 않는다 — 런타임 env 로만.

위 `--build-arg` 플래그는 스테이지별로 중복 전달할 필요 없다 — Docker 가 같은 이름의 최상위 build-arg 값을 `builder`·`runner` 양쪽 `ARG` 선언에 그대로 공급하므로, 한 번의 `docker buildx build` 호출로 `NEXT_PUBLIC_ROUTINE_ENABLED`·`NEXT_PUBLIC_REPORTS_ENABLED` 가 브라우저 번들과 `runner` 스테이지 `server.js` 런타임에 동일하게 반영된다.
