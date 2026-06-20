/**
 * 자체 BE planner 클라 → pullim-api(흡수형) 데이터 클라 cutover (흡수 전환 §10).
 *
 * 소비처(planner-manage 컨테이너·decorate-section)는 `plannerClient`/`apiToPlanner`/`toWriteInput`
 * 를 이 경로에서 그대로 import 하므로 **무변경**이다. 구현만 `./pullim-client`(쿠키 SSO + CSRF,
 * dev-api `/planner/*`, raw JSON)로 위임한다. 자체 BE(Bearer + 엔벨로프) 호출은 폐기한다.
 *
 * 인증은 쿠키 세션(`auth-context` 가 `pullimSession` 으로 복원·로그인)으로 일원화된다 —
 * 데이터 클라가 별도 토큰을 들지 않는다.
 */
export {
  pullimPlannerClient as plannerClient,
  pullimToPlanner as apiToPlanner,
  toPullimWrite as toWriteInput,
} from './pullim-client';
