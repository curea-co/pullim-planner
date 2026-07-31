/**
 * PUDS Donut(vendored) 스모크 — 렌더 · 색 폴백(footgun 가드) · 경계값.
 * 리뷰 지적(스모크 0) 대응. core Jest 매처만 사용.
 */

import { render, screen } from "@testing-library/react";
import { Donut } from "@/components/charts/donut";

describe("Donut (PUDS vendored)", () => {
  it("centerLabel·segment(path)를 렌더한다", () => {
    const { container } = render(
      <Donut
        segments={[
          { label: "완료", value: 61, color: "var(--color-primary-600)" },
          { label: "남음", value: 39, color: "var(--color-gray-200)" },
        ]}
        centerLabel="61%"
        centerSubLabel="완료율"
        showLegend={false}
      />,
    );
    expect(screen.getByText("61%")).toBeTruthy();
    expect(screen.getByText("완료율")).toBeTruthy();
    expect(container.querySelectorAll("path").length).toBe(2);
  });

  it("color 미지정 시 플래너 PUDS 토큰으로 폴백한다(--chart-cat 아님 — 투명 방지)", () => {
    const { container } = render(
      <Donut segments={[{ label: "a", value: 1 }, { label: "b", value: 1 }]} showLegend={false} />,
    );
    const fills = Array.from(container.querySelectorAll("path")).map((p) => p.getAttribute("fill") ?? "");
    expect(fills.every((f) => !f.includes("chart-cat"))).toBe(true);
    expect(fills[0]).toContain("--color-");
  });

  it("경계값(완료 100 / 남음 0)도 throw 없이 렌더된다", () => {
    expect(() =>
      render(
        <Donut
          segments={[{ label: "완료", value: 100, color: "var(--color-primary-600)" }, { label: "남음", value: 0, color: "var(--color-gray-200)" }]}
          centerLabel="100%"
          showLegend={false}
        />,
      ),
    ).not.toThrow();
  });
});
