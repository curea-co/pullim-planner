# 플래너 엔타이틀먼트 — 사용자 유형별 표시 검증

작성 2026-07-06 · 근거: pullim-api 코드 실측 (게이트키퍼 "사용자 유형별 표시 표" 플래너 행 대조)

## 검증 대상 (게이트키퍼 표 — 로그인 화면 "이용 가능한 서비스")

| 서비스 | 게스트¹ | 일반 회원 (home/free) | 수원-새빛인강 (학생 쿠폰) | 수원 티처 (SUWON-TEACHER) |
|---|---|---|---|---|
| 플래너 | — (차단) | `free` | `free` ⁴ | `free` |

**결론: 4칸 모두 실제 구현과 일치 — 문제 없음.** (검증일 기준)

## 근거 (pullim-api 실측)

SoT: `src/auth/common/constants/entitlement-flags.constants.ts` (2026-07-06 오너 결정 반영)
+ `src/common/verify/service/entitlement-policy.service.ts` (L0 진입 게이트)

| 표 항목 | 코드 실측 |
|---|---|
| 게스트 — (차단) | 게스트는 `entitlements` 부재 → `flags={}` → `EntitlementGuard` 403. 진입 판정 = `flags.planner ≥ 1` (0/미존재 = 패키지 미포함 = L0 차단) |
| 일반 회원 `free` | `home/free` = 가입 floor 7종(q·planner·writing·studio·store·reader·classbot)에 **`planner: 1`** 포함 |
| 수원 학생 `free` ⁴ | B2G 계정은 **entitlement 행을 `home/free`로 유지**, 쿠폰은 무상 plan grant(`suwon/b2g`, ADR-051, 만료 2026-12-31). 표시 tier = `free` 정확 |
| 수원 티처 `free` | teacher 전용 planner 셀 없음 → `home/free`의 `planner: 1`. (games teacher_author 만 교사 별도 — planner 무관) |

## ⚠️ 유의 — suwon/b2g 는 실 등급 `planner: 2`

- `suwon/b2g` 번들은 **`planner: 2`** 를 mint 한다 (home/free 의 1보다 높음).
- 현재는 차이 없음: 진입 판정이 "≥1"이고, planner 도메인에 level 2 차등 기능이 **없다**
  (grep 확인 — 전 컨트롤러가 `flags.planner≥1` 진입 게이트만 사용, 기능 등급차등은 핸들러 몫인데 미구현. ADR-018).
- **미래 함의**: 플래너에 유료 차등 기능이 생기면 수원 학생은 자동으로 상위 등급이 된다.
  기능 설계 시 level 1 vs 2 경계를 명시적으로 정할 것.
- **각주 ⁴ 확인 권장**: 게이트키퍼 표의 각주가 "쿠폰 grant 로 실 등급 planner:2 (현재 기능 차등 없음)" 를
  담고 있는지 확인. 없으면 추가 요청.

## studygram 엔타이틀먼트 (참고)

- studygram(공유)은 **별도 flag 미도입** — planner 하위기능으로 **`flags.planner` 재사용**
  (컨트롤러 주석 명시: setting·friendship·study-proof). 과거 plan 문서의 "별도 `flags.studygram`" 결정은
  구현 시 planner 재사용으로 정리됨.

## 관련

- 아키텍처 문서: `proc/2026-07-05_planner-architecture.html` (§03 엔드포인트 맵 · 검증 메모)
- 게이트키퍼 현황: `daily_outcome/2026-06-26_gatekeeper-status.md`
