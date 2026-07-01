# 로컬 SSO 구성 — planner (`planner.pullim.local:3006`)

작성 2026-06-29 · 목적: 로컬에서 중앙 로그인(SSO) + 개인별 데이터 저장·dev 기능 검증.

## 핵심 원리 (왜 localhost 가 아니라 pullim.local)
prod는 `*.pullim.ai` 가 같은 site → `Domain=.pullim.ai` 쿠키가 서브도메인 간 SSO. 로컬에서 `localhost`는 **eTLD(public suffix)** 라 `os.localhost`·`api.localhost`가 서로 cross-site → 쿠키 미전송(403/CSRF). 따라서 **`pullim.local`(public suffix 아님)** 을 `/etc/hosts`로 127.0.0.1에 매핑해 same-site를 흉내낸다. **planner FE도 `planner.pullim.local`에서 떠야** API(`api.pullim.local`)와 same-site → 쿠키 전송.

> 절차 SoT = pullim-web 런북 `docs/common/2026-06-22-local-pullim-local-sso/runbook.md`. 포트 SoT = pullim-api `.claude/rules/local-ports.md`(planner=3006). CORS/CSRF 값 = config-catalog §2.

## STEP 1 — `/etc/hosts` (sudo) ※ 사용자
```bash
echo '127.0.0.1 pullim.local os.pullim.local api.pullim.local planner.pullim.local' | sudo tee -a /etc/hosts
```
**확인할 것**:
- `planner.pullim.local` **포함**됐는지(규칙: SSO 합류 앱 서브도메인을 같은 줄에 덧붙임).
- 중복 줄 없는지: `grep pullim.local /etc/hosts`
- 해석되는지: `dscacheutil -q host -a name planner.pullim.local` → `127.0.0.1`

## STEP 2 — planner `.env.local` ※ 완료 (2026-06-29)
```
NEXT_PUBLIC_PULLIM_API_URL=http://api.pullim.local:3000   # was http://localhost:3000
NEXT_PUBLIC_PULLIM_CSRF_COOKIE=local-pullim-csrf          # pullim-api 로컬 CSRF_COOKIE_NAME 과 일치
NEXT_PUBLIC_DEV_AUTH_BYPASS=0                             # was 1 (실 로그인 검증). 복구=1
```
> 복구: API_URL→`http://localhost:3000`, BYPASS→`1`.

## STEP 3 — planner 3006 실행 ※ 내가 가능(STEP 1·4 후)
```bash
cd apps/planner && ~/.bun/bin/bunx next dev -p 3006
# 접속: http://planner.pullim.local:3006/planner
```
> Next 16 dev가 `planner.pullim.local` 오리진 막으면 `next.config.ts` `allowedDevOrigins:['planner.pullim.local']` 필요(설정 변경=확인). 런북에 있으면 따름.

## STEP 4 — 의존 서비스 기동 ※ 사용자/게이트키퍼
| 서비스 | 호스트 | 확인할 것 |
|---|---|---|
| pullim-api | `api.pullim.local:3000` | ① 기동: `curl -s -o /dev/null -w '%{http_code}' http://api.pullim.local:3000/auth/csrf` → 2xx ② `CORS_LOCAL_ORIGINS` 에 `http://planner.pullim.local:3006` 포함 ③ **flags.planner 부여 테스트 계정**(`seed-member`) A·B 2개 |
| pullim-os | `os.pullim.local:3001` | 로그인 UI 로드(`http://os.pullim.local:3001/login`) |

## STEP 5 — 로그인 + 개인별 데이터 검증 ※ 내가 가능
1. `os.pullim.local:3001/login` 로그인(계정 A) → 쿠키 발급(host-only on `api.pullim.local`)
2. `planner.pullim.local:3006/planner` → `GET /planner/me` 쿠키 세션 복원 → authenticated
3. 계정 A로 시간표 생성(`POST /planners`) → `GET /planners` 노출 → 로그아웃 → **계정 B 로그인 → A 시간표 안 보임**(user_id 격리)

## STEP 6 — 트러블슈팅
- `/auth/refresh` 403·게스트 → 호스트가 `localhost`(cross-site)인지 → `*.pullim.local` 접속
- CSRF 에러 → `NEXT_PUBLIC_PULLIM_CSRF_COOKIE` ≠ API 쿠키명
- CORS 에러 → `CORS_LOCAL_ORIGINS` 에 `http://planner.pullim.local:3006` 없음(게이트키퍼)

## 역할
- **planner(나)**: STEP 2 ✅ · STEP 3 · STEP 5
- **사용자/게이트키퍼**: STEP 1(sudo) · STEP 4(pullim-api·os 기동 + CORS + seed 계정)
