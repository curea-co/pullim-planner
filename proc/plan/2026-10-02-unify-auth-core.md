# 공통 인증 core 로컬 복사 통합

사용자 승인: 10개 저장소에 동일 바이트 core를 로컬 복사하고 활성 인증 경로에 연결한다. 공유 패키지/레지스트리는 생성하지 않는다. 2026-10-02 추가 승인으로 feature commit/push 및 dev 대상 PR 생성까지 진행한다. merge/deploy는 보류한다.

계약: CSRF_TOKEN_MISMATCH만 1회 재발급·재시도, Origin/권한403 재시도 없음. refresh401만 세션 만료, 403/5xx/network는 오류 보존. 요청401→refresh→원요청 최대1회. refresh singleflight/backoff/교차탭 조정은 core 단일 정의. 기존 신원/권한 계약 및 민감정보 비노출 유지.

어댑터: planner 브라우저 직접 호출 및 기존 성공재사용/교차탭 보호 유지. admin staff scope와 endpoint를 member 세션에서 격리. arcade BFF는 요청별 core 인스턴스로 쿠키/신원 공유 없이 trusted Origin과 Set-Cookie 전달 유지.

검증: 공통 회귀 시나리오 및 서비스 오류/권한 회귀, 저장소 전체 필수 lint/typecheck/test/build, 필요한 UI/e2e. core 버전/SHA256을 기록한다. 기존 다른 작업 dirty와 output은 보존한다.

진행: 설계 선행 완료, 공통 core 계약 대기 및 기존 adapter 분석 중.

## 구현 계약 확정
- core 1.0.0 원본 SHA256: a3b58e771922437d9deffb7af50345b09dab01e25bd119ddc7655686054558b8. 공통계약 시나리오13개 동일복사.
- 실패 cooldown 5초부터 지수증가(최대 base60초+jitter25%), 실패 원인 보존. 401 실패도 cooldown 동안 재발급 추가호출을 억제하며 성공으로 위장하지 않는다.
- 성공1초재사용, 같은 FE origin 내 WebLocks+성공timestamp(다른서비스 origin 간 lock공유를 의미하지 않는다). 로그인/로그아웃 전환은 reset, 이전 세대 pending 결과/재시도는취소.
- arcade: refresh성공 후 /me401은 세션 전체무효라고 단정하지 않고 error로 보류. Arcade의 최종 계약은 읽기 전용 BFF와 브라우저 직접 refresh/logout이다.
- admin: staff realm 분리, 초기403/5xx/network는로그인redirect대신오류+재시도화면. 로그인 상태변경 후이전세션조회가덮어쓰지않게 generation검사. E2E는가짜인증응답만사용한다.
- planner: 기존sessionExpired분류와cookie-http의4011회재요청계약유지, 성공1초/cross-tab보호를core로대체. 다른작업의chart수정은건드리지않는다.

## 최종 호출 흐름
session singleton core가 refresh singleflight/backoff/cross-tab/성공재사용을 단일 소유한다. cookie-http는 GET/도메인 전송 공통의 401→주입 refreshSession→원요청1회와 기존 sessionExpired DTO 마커를 유지한다. mutation core.execute(refresh:false)는 CSRF 복구를 맡고 operation-local refreshed 표시로 CSRF 재전송 때 401 예산이 다시 열리지 않게 한다. execute(refresh:true)로 전체 이관하려면 모든 GET/domain transport의 오류 API까지 바뀌므로 이번에는 검증된 기존 계약을 보존한다. 401→refresh성공→TOKEN403→CSRF복구→401 sequence에서도 refresh1회 회귀를 고정했다.

## 검증 결과
bun run typecheck / lint / test --runInBand / build: 모두 exit0. 56 suites, 515 tests PASS. lint 기존범위 경고2개는미수정. 원격 실제계정/배포 검증은 미실행; 아래 로컬 fixture 실검증과 구분한다. 기존chart2파일및.playwright-cli/output보존.

### 계정 전환 취소 경계
session factory의 authGeneration getter를 실제 domain client config로 공유한다. 로그인/로그아웃 reset시 generation증가. cookie-http는응답수신후및refreshawait후검사, mutation은CSRF대기후send직전검사한다. 이전계정으로시작한요청의새계정재전송과늦은신원반환을차단한다. delayed refresh→계정전환(write1회),delayedcsrf→계정전환(write0회),lateGET→계정전환(결과폐기)회귀포함.

## 로컬 production 실브라우저 검증
로컬 API/DB synthetic fixture로 중앙 UI 로그인, 온보딩 PATCH200, 플래너 홈과 시간표 생성/수정을 확인했다. 생성 첫 요청 CSRF 헤더만 의도적으로 변조한 실제 서버 검증은 POST403→CSRF200→POST201→activate200이며 생성 성공은 1회다. AT만 제거한 수정은 PATCH401→CSRF200→refresh200 1회→PATCH200이었다. 복제201/삭제204는 브라우저 fetch로 실행하여 실제 UI 생성/수정과 구분한다. production build/start 완료, http://planner.pullim.local:3106 유지. 외부 유료 호출/원격 배포 없음. HTTP WebLocks 미제공으로 HTTPS 교차탭 직렬화는 미검증.
