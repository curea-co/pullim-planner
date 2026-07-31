/**
 * Jest setup smoke test — `config/jest.setup.ts` + `apps/planner/test/setup.ts` 가
 * 실제로 로드되는지, alias / next/navigation mock / RTL 환경이 정상인지 검증.
 *
 * Codex review #4369887321 대응 — 단순 `1+1` 검증은 setup 회귀를 잡지 못한다.
 */

import { render, screen } from "@testing-library/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

describe("planner jest harness", () => {
  it("@/* alias 가 동작한다 (lib/utils 의 cn export)", () => {
    expect(typeof cn).toBe("function");
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("next/navigation mock 이 전역으로 적용된다 (config/jest.setup.ts)", () => {
    const router = useRouter();
    expect(typeof router.push).toBe("function");
    expect(typeof router.replace).toBe("function");
    expect(usePathname()).toBe("/");
    expect(useSearchParams().toString()).toBe("");
  });

  it("RTL + jsdom 으로 React 컴포넌트를 렌더할 수 있다", () => {
    function Hello({ name }: { name: string }) {
      return <span data-testid="hello">hi {name}</span>;
    }
    render(<Hello name="planner" />);
    expect(screen.getByTestId("hello").textContent).toBe("hi planner");
  });
});
