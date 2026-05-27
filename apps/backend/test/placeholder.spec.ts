/**
 * Placeholder spec — `apps/backend` 은 아직 도메인 코드가 없다 (NestJS 11 skeleton).
 *
 * 이 placeholder 가 존재하는 이유:
 * - `--passWithNoTests` 만 의존하면 Jest 패턴이 깨지거나 spec 파일이 전부 누락돼도
 *   CI 가 계속 green 으로 남는 회귀 신호 제거 문제가 있음 (Codex review #4369887321)
 * - 최소 한 개의 spec 이 실제로 통과해야 CI 가 정상으로 간주
 * - 실 도메인 spec 이 추가되면 이 파일은 자연 폐기됨 (Phase γ 이후)
 */

describe("@pullim-planner/backend test harness", () => {
  it("jest 가 spec 파일을 정상적으로 수집·실행한다 (placeholder)", () => {
    expect(1 + 1).toBe(2);
  });

  it("Node 환경이 기본 객체를 제공한다", () => {
    expect(typeof process).toBe("object");
    expect(typeof Buffer).toBe("function");
  });
});
