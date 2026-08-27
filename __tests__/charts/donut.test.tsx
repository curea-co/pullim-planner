/**
 * PUDS Donut(vendored) 스모크 — 렌더 · 색 폴백(footgun 가드) · 경계값.
 * 리뷰 지적(스모크 0) 대응. core Jest 매처만 사용.
 *
 * 2026-08-26: donut.tsx 를 PUDS v0.3.0 원본과 **바이트 동일**하게 되돌렸다(로컬 델타 0).
 * 폴백 가드의 원래 취지는 "color 미지정 세그먼트가 투명해지는 것"을 막는 것이었다.
 * 그 취지는 유지하되 **폴백 토큰이 실제로 정의돼 있는지**를 단언하는 쪽으로 바꾼다 —
 * `--chart-cat-1..8` 은 처음부터 app/tokens/_base.css 에 있었다(폴백 교체의 전제가 틀렸다).
 */

import { readFileSync } from "fs";
import { join } from "path";
import { render, screen } from "@testing-library/react";
import { Donut } from "@/components/charts/donut";

const baseCss = readFileSync(join(__dirname, "../../app/tokens/_base.css"), "utf-8");

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

  it("color 미지정 시 --chart-cat-* 로 폴백한다 (원본 그대로)", () => {
    const { container } = render(
      <Donut segments={[{ label: "a", value: 1 }, { label: "b", value: 1 }]} showLegend={false} />,
    );
    const fills = Array.from(container.querySelectorAll("path")).map((p) => p.getAttribute("fill") ?? "");
    expect(fills[0]).toBe("var(--chart-cat-1)");
    expect(fills[1]).toBe("var(--chart-cat-2)");
  });

  it("폴백 토큰 --chart-cat-1..8 이 실제로 정의돼 있다 (투명 세그먼트 방지)", () => {
    for (let i = 1; i <= 8; i += 1) {
      expect(baseCss).toMatch(new RegExp(`--chart-cat-${i}:\\s*[^;]+;`));
    }
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
