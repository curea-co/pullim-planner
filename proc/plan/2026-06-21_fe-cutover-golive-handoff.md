# 2026-06-21 — planner FE cutover 라이브 전환 핸드오프 (§10 go-live)

> **성격**: `pullim-planner` FE 를 자체 NestJS BE(legacy :4030)에서 **흡수된 pullim-api planner
> 모듈**(`dev-api.pullim.ai/planner/*`, 쿠키 SSO)로 전환한 **라이브 cutover 의 실행·배포 상태**
> 기록 및 후속 핸드오프. 흡수 설계/플랜의 권위 문서는
> [2026-05-26_pullim-be-adoption.md](2026-05-26_pullim-be-adoption.md) §10,
> BE 흡수 핸드오프는 [2026-06-15_planner-pullim-api-absorption-handoff.md](2026-06-15_planner-pullim-api-absorption-handoff.md).

## 1. 완료 — 코드 (main 머지됨)

| PR | 내용 |
|---|---|
| #61 | `@pullim-planner/api-client` — pullim-api planner 데이터 클라이언트 |
| #63 | api-client — 프로필 upsert(`PATCH /planner/me`) + blocks 완료메타 |
| #62 | FE cutover — 데이터·로그인을 pullim-api 쿠키 SSO 로 전환 |

cutover 골자:
- 인증: 자체 BE 토큰 → **pullim 쿠키 SSO**(HttpOnly, `Domain=.pullim.ai`, CSRF double-submit).
- 세션 상태: `GET /planner/me` 결과로 판정 — 200=authenticated, 401=unauthenticated,
  403=forbidden(엔타이틀먼트 `flags.planner` 미보유),
  **`404`(프로필 행 없음) 또는 `200 + onboardedAt == null` = onboarding**.
  ⚠️ **온보딩 판정은 404 단정 금지**: 2026-06-15 흡수 핸드오프 §3.2 정식 계약상 둘 다 온보딩 상태다.
  프로필 행은 생성됐지만 온보딩이 안 끝난 사용자(`onboardedAt==null`)를 홈으로 보내지 않도록
  FE 는 `onboardedAt` 분기를 반드시 둔다(앞문장만 읽고 404 만 분기하지 말 것).
- 온보딩: 서버 상태 단일 권위(`/planner/me` 404 또는 `onboardedAt==null` → 온보딩). localStorage 첫방문 가드 제거.
  진입 시 `PATCH /planner/me`(서버 기본값) 로 프로필 생성, 실패 시 재시도/로그아웃 탈출.
- 자체 회원가입 비활성 → `/login` 리다이렉트(중앙 KCB 가입은 후속). `checkEmail` 만 한시적 legacy.
- dev-reset 버튼: pullim 쿠키 로그아웃을 **await 후** 리로드(세션 복원 회귀 방지).

## 2. 완료 — dev 배포 (dev-planner.pullim.ai)

**배포 메커니즘 (중요 — 오해 방지)**:
- `dev-planner.pullim.ai` 는 **별도 프로젝트/팀이 아니라**, prod 와 **같은** Vercel 프로젝트
  `pullim-planner`(`prj_nmZl1Hbx7mAwN3pJyGOyIewJwlA3`, team `contact-4267s-projects`)에 붙은
  **git 브랜치 도메인**(`gitBranch=dev`)이다.
- 즉 **`dev` 브랜치를 푸시하면** Vercel git 연동이 dev:preview 로 자동 빌드 → dev-planner 갱신.
  dev 가 한 번도 배포 안 돼 404 였던 것을, `main → dev` fast-forward 푸시로 해소.
- env(주입됨, **Preview · gitBranch=dev 스코프**):
  - `NEXT_PUBLIC_PULLIM_API_URL = https://dev-api.pullim.ai`
  - `NEXT_PUBLIC_PULLIM_CSRF_COOKIE = dev-pullim-csrf`
  - (미설정 시 코드 fallback 은 `http://localhost:3000` / `local-pullim-csrf`)
- 접근: Vercel Deployment Protection `all_except_custom_domains` — **prod 커스텀 도메인은 공개,
  preview 브랜치 도메인(dev-planner)은 보호(401)**. 결정: **팀 전용 유지**(Vercel 로그인 후 접근).
- **런타임 검증 완료**(2026-06-21, 오너 확인): 로그인 → 온보딩 → 데이터 동작 OK.

**dev-api 준비 상태**: `/auth/csrf` 200, `/planner/me`(GET 401/PATCH 존재), `/planner/planners*`
등 전체 surface 서빙. `PATCH /planner/me`(#162) 배포 완료.

## 3. 의도적 보류 — prod (planner.pullim.ai)

- **main → prod 자동배포가 켜져 있어**, #62 머지가 prod 를 cutover(sha `9b7f12e`)로 자동 배포함.
- **production 스코프 env 가 비어 있음** → cutover 가 API 베이스를 `localhost:3000` 으로 잡음 →
  prod 의 로그인·SSO·데이터 호출은 **현재 비동작**(루트 페이지는 200 으로 뜸).
- pullim-api **prod 가 아직 없어** prod 는 cutover 를 정상 구동할 수 없음.
- **결정(2026-06-21, 오너): 그대로 둔다(option b)** — 롤백·자동배포 차단 안 함. pullim-api prod
  준비 시 prod env 주입 + 정식 전환.
- ⚠️ 참고: 이 자동배포는 메모리상 "production 은 PM 수동 슬롯에서만" 정책과 어긋난다. prod
  본전환 시점에 `git.deploymentEnabled.main=false` 가드(브랜치
  `ci/vercel-dev-branch-autodeploy` 에 `apps/planner/vercel.json` 초안 존재) 도입 여부 재검토.

### 3.1 ⚠️ 재발 조건·가드 (후속 작업자 필독 — 오판 금지)

prod 가 **비동작인 채로 main 자동배포가 열려 있는** 현 상태는 두 가지 조용한 함정을 동반한다.
prod 를 만지기 전 반드시 인지할 것:

1. **main 머지 = prod 자동 덮어쓰기.** main→prod 자동배포가 켜져 있으므로, prod 본전환 전까지
   **main 에 머지하는 모든 변경이 즉시 prod(planner.pullim.ai)로 반영**된다. prod 가 깨진 현
   상태가 main 머지마다 재생산된다. ⇒ prod 본전환 전이라면 (a) main 머지 시 prod 영향을 매번
   인지하거나, (b) `git.deploymentEnabled.main=false` 가드를 먼저 도입해 자동배포를 끊는다.
2. **env 누락 = 빌드 에러 없는 런타임 전멸.** production 스코프에 `NEXT_PUBLIC_PULLIM_API_URL`
   / `NEXT_PUBLIC_PULLIM_CSRF_COOKIE` 가 없으면 빌드는 **성공**하고 코드가 조용히
   `http://localhost:3000` / `local-pullim-csrf` 로 폴백한다 — 페이지는 200 으로 뜨지만 API·SSO·
   데이터가 런타임에만 전멸한다(현 prod 가 바로 이 상태). ⇒ prod 본전환 시 **production env 를
   먼저 주입한 뒤 배포**하고, 배포 후 **번들에 `localhost:3000` 이 없는지** 반드시 확인한다.

## 4. 남은 작업 (후속 트랙)

1. **prod cutover 본전환** — pullim-api **prod** 생성 시: production env(prod API url +
   csrf 쿠키) 주입 → prod 정상 구동. main→prod 자동배포 정책 정리 동반.
2. **중앙 가입(KCB) 배선** — 현재 자체 signup 비활성(`SIGNUP_DISABLED` throw)·`/login`
   리다이렉트. 중앙 가입 연결 후 `checkEmail` 의 legacy 의존도 제거.
3. **온보딩 프로필 수집 폼** — 현재 진입 시 서버 기본값으로 자동 생성(빈 `PATCH /planner/me`).
   학년/계열 등 실제 입력 폼 추가(부분 upsert 라 이후 보강 가능).

## 5. 운영 노트 (gotcha)

- **Vercel CLI 53.2.0(구버전) 은 거짓 `Not authorized`/`no access` 를 낸다.** 도메인/프로젝트
  소유·할당 확인은 **REST API(토큰)** 를 신뢰할 것. (이번 cutover 중 CLI 오류 때문에 존재하지
  않는 "다른 팀(team_cITs)" 문제를 한참 추적한 전례 있음 — 실제로는 전부 동일 프로젝트였다.)
- dev 배포 = **`dev` 브랜치 푸시**(별도 `vercel deploy` 불필요). dev 는 main 의 fast-forward 로 유지.
- 프로젝트: `pullim-planner` = `prj_nmZl1Hbx7mAwN3pJyGOyIewJwlA3`, team `contact-4267s-projects`.
