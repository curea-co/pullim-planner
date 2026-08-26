/**
 * `cn` 구현은 PUDS 가 `lib/cn.ts` 로 벤더링한다 (`@puds/cn` — 레지스트리 target 이 `lib/cn.ts` 로 고정).
 * 이 파일은 기존 호출부(`@/lib/utils`, components.json 의 utils alias)를 위한 재export 층이다.
 * 구현이 두 벌이 되지 않게 여기서 다시 정의하지 말 것 — PUDS 컴포넌트는 `@/lib/cn` 을 그대로 쓴다.
 */
export { cn } from "./cn";
