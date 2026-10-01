# 플래너 초기 프로필 상태 조회

## 계획과 소유 범위

사용자 승인: 정상 초기 설정의 404를 없애고 기존 온보딩을 유지한다. 이 문서는 프런트 작업 계약·진행·검증의 소유 문서다. 소스 소유는 `lib/api-client/pullim-session.ts`의 세션 조회와 `lib/auth/auth-context.tsx`의 상태 전이이며, UI·공통 훅·설정은 변경하지 않는다.

2026-10-01 읽기 확인: 실제 Vercel `pullim-planner` production은 `curea-co/pullim-planner` main `62509df33aac24fb0f4a1e6aa86769c12d33c37e`를 사용한다. monorepo 사본은 이 프로젝트의 배포 소스가 아니다. 해당 main에서 기능 브랜치를 생성했다.

## 계약

서버의 additive `GET /planner/me/status`를 사용한다. JSON `{profile: 프로필 객체}`는 authenticated, `{profile: null}`만 onboarding이다. 기존 GET/PATCH `/planner/me` 계약은 서버에서 유지된다. 클라이언트 `session()`은 envelope를 해제하여 프로필 또는 null을 반환한다. 빈 본문·잘못된 envelope는 오류로 처리한다.

401/403 및 서버·전송 실패의 기존 상태 전이를 유지한다. 신규 endpoint의 404는 서버 배포 미적용 등을 뜻하므로 onboarding으로 처리하지 않는다. 계정 세대(accountGen) 검사를 모든 응답 전에 유지하여 늦은 결과가 현재 계정을 덮지 않게 한다. 프로필 생성은 기존 온보딩 PATCH만 담당한다.

## 배포와 검증 계획

서버를 먼저 배포하여 인증된 status 조회에서 profile null/객체가 JSON으로 반환되는 것을 확인한 뒤 프런트를 배포한다. 구 서버 fallback은 추가하지 않는다. 프런트 롤백은 기존 GET 계약을 이용할 수 있다.

회귀 RED → 구현 → 대상 테스트 → typecheck/lint/전체 Jest/build 순으로 검증한다. 브라우저에서는 인증 우회 없이 API 응답을 가로채 null→온보딩 PATCH→기존 프로필 화면, endpoint 404→재시도 오류, 401/403 구분을 확인할 수 있다. 실 개발 배포에서는 테스트 계정으로 같은 흐름과 네트워크 status 200을 확인한다.

## 진행 및 결과

- 설계 선행 → 회귀 RED(2 suites, 11 실패/10 통과) → 구현 → 대상 회귀 GREEN(5 suites, 30 통과) 완료. 증거: `/tmp/planner-profile-status-red.log`, `/tmp/planner-profile-status-green.log`.
- 구현: 세션 클라이언트가 status envelope를 해제하고 잘못된 응답을 거부한다. AuthProvider는 null을 onboarding으로 해석하고 HTTP 404를 오류로 남긴다. 기존 프로필 표시, 401/403, 늦은 계정 응답 방지, refresh 동시성 회귀를 확인했다.
- 첫 typecheck는 기존 설치에 `@playwright/test`가 누락되어 실패했다. `bun install --frozen-lockfile`로 기존 잠금 버전 의존성만 복원했으며 package/lock/config 변경은 없다.
- 최종 직렬 검증: `bun run typecheck` PASS → `bun run lint` PASS → `bun run test --runInBand` 55 suites/490 tests PASS → `bun run build` PASS. `git diff --check` PASS.
- lint의 기존 경고 2건(`monthly-progress-card.tsx`의 totalBlocks, `nav-config.ts`의 _role)은 이번 범위 밖이며 신규 경고는 없다.
- 최종 로그: `/tmp/planner-status-typecheck-final.log`, `/tmp/planner-status-lint-final.log`, `/tmp/planner-status-tests-final.log`, `/tmp/planner-status-build-final.log`.
- 독립 생산 코드 리뷰와 실브라우저 합성 응답 검증 완료. `localhost:3016`, `AUTH_BYPASS=0`에서 API를 모두 모킹하고 비로컬 외부 요청을 차단했다.
- 브라우저 PASS: `{profile:null}` → 온보딩 → 기존 mount 시점 PATCH 200 → 시작하기 → 홈 → 새로고침 후 홈 유지. status endpoint 404는 온보딩 대신 재시도 오류, 403은 권한 없음, 401은 refresh 실패 후 미인증 안내로 구분됐다.
- 브라우저 증거: `output/playwright/profile-status-browser-verification.json`과 같은 디렉터리 PNG 5장. 이 파일들은 로컬 검증 산출물이며 API의 실제 운영 결과가 아니다.
- 검증 한계: localhost에서는 기존 SSO 미지원 안내까지만 확인했으며 실제 중앙 로그인은 검증하지 않았다. 개발 StrictMode에서 기존 온보딩 mount effect의 PATCH가 2회 관찰됐고 둘 다 모킹했다. 이번 변경은 그 생성 동작을 바꾸지 않으며 운영 중복 요청 여부를 입증하는 결과는 아니다.
- 검증용 서버와 브라우저를 종료했다. 실제 개발 환경 확인과 기능 배포는 아직 수행하지 않았다.

## 개발 반영 준비

사용자가 개발까지 커밋·PR·배포를 승인했다. 게시 직전 원격 main이 `62509df33aac24fb0f4a1e6aa86769c12d33c37e`이고 dev가 없는 것을 재확인하고, 동일 SHA에 `refs/heads/dev`를 생성해 기존 개발 경로를 복구했다. 기능 코드를 보호 브랜치에 직접 반영한 것은 아니다. 이 ref 생성만으로도 같은 main 코드의 preview 자동 배포가 발생할 수 있다.

읽기 확인한 Vercel 설정: production은 main 및 `planner.pullim.ai`, 개발 도메인 `dev-planner.pullim.ai`는 dev 브랜치에 연결돼 있다. dev/일반 preview의 API는 `https://dev-api.pullim.ai`, CSRF 이름은 `dev-pullim-csrf`, OS는 `https://dev-os.pullim.ai`다. 운영 main과 production 설정은 변경하지 않았다.

기능 PR의 base는 dev로 지정한다. 서버의 status endpoint 개발 배포 완료 확인 후에만 프런트 PR을 머지한다. 로컬 브라우저 원본 `.playwright-cli/` 및 `output/playwright/`는 커밋에서 제외한다.
