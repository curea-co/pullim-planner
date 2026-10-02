# WT-4 세션 CSRF 복구·실패 분류

사용자 승인: 정상 사용자의 플래너 세션 오류 수정. API의 Origin 엄격 검증은 유지한다.

## 선행 계약

- BE CSRF_ORIGIN_REJECTED403은 재부트스트랩으로 복구하지 않는다.
- CSRF_TOKEN_MISMATCH403만 CSRF 재취득 후 정확히1회 재시도한다. 메시지 텍스트는 판정하지 않는다.
- 세션 복원에 전파된 두 CSRF403은 권한 부족이 아닌 error 상태다. /me 추가 조회 없이 실패를 표시한다. 실제 권한403은 기존 forbidden과 계정 조회를 유지한다.
- 같은 판정 helper를 도메인·세션 클라이언트와 상태 분류에서 사용한다. 기존 멀티탭/single-flight는 변경하지 않는다.

## 근거와 한계

10/1 origin_missing16건에서 status401→refresh403두번→me401→refresh403두번 흐름을 확인했다. 세션 클라이언트의 광범위 메시지 판정과 권한 오인이 증폭을 설명한다. 최초 Origin 누락 원인은 미확정이며 이 수정으로 근본 해결했다고 주장하지 않는다. Content-Type 차이는 별도 재현 전까지 변경하지 않는다.

## 검증

RED 회귀 후 대상 및 전체 test/typecheck/lint/build, 가능하면 로컬 브라우저 확인. 원격 요청·배포·커밋은 별도 통합 판정 후 진행한다.


## 구현·검증 기록

- 공유 `lib/api-client/csrf-error.ts`에서 code 기반 판정을 소유한다. 세션과 도메인 클라이언트는 token mismatch만 복구하고 AuthProvider는 CSRF 거절을 일반 연결 오류 상태로 보존한다.
- RED: 기존 코드에서 신규5개 실패/16개 통과. GREEN: 대상21개 통과 후 실제 SessionClient→AuthProvider 연계2개 추가.
- 전체 Jest55 suites/497 tests 통과(7.836초), typecheck 통과, lint 오류0/기존 경고2, build 통과. 로그 `/tmp/planner-csrf-{red,green,all-tests,typecheck,lint,build}.log`.
- 실제 연계 회귀에서 최초 프로필401→Origin403의 refresh1회 후 error, token mismatch는 최대2회 후 error, 추가 /me 요청0을 확인했다. 정상 권한403·성공 복구·멀티탭 single-flight 기존 회귀 통과.
- 별도 담당자의 Chrome4/WebKit3 로컬 실험에서 빈 POST와 JSON 모두 Origin을 보냈다. 개발 HTTPS에서도 브라우저별 합성 무인증 refresh는 Origin 검증을 통과해401이었다. 최초 누락 재현 실패이며 Content-Type 차이를 원인으로 채택하지 않았다.
- 실 UI mock API 브라우저 3종 PASS: Origin 거부는 refresh1/csrf1/me0/status1과 연결 오류·재시도 UI, 토큰 불일치는 refresh2/csrf2/me1/status2 후 홈, 실제 권한 거부는 refresh0/csrf0/me1/status1과 기존 권한 안내 확인. 초기 화면 selector가 합성 이름 전체 표시를 가정해 타임아웃했으나 실제 홈 문구로 수정 후 통과했으며 생산 코드는 변경하지 않았다. 원본 브라우저 증거는 레포에 넣지 않는다.
- 부모 에이전트의 생산 코드 검수 PASS, 빈줄 정리 후 lint·diff check 통과. 사용자 개발 진행 승인 범위에서 선택 커밋·PR을 진행하고 CI 이후 dev 머지·배포를 판정한다.
