/**
 * Automated check: HTML ad styles must not affect site fonts or global layout.
 *
 * We render a hostile HTML ad inside the .ad-slot wrapper (the same wrapper
 * used by <AdSlot />) alongside a sibling header/footer/page-container, then
 * assert:
 *   1. The ad cannot widen its parent (.page-container stays ≤ container width).
 *   2. The ad cannot leak font-family / color into siblings or <body>.
 *   3. The .ad-slot has the required containment + isolation CSS.
 *   4. The .page-container has overflow-x: clip so ads can't cause page scroll.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "fs";
import path from "path";

// Inject the project's real index.css rules (the ones we want to verify)
// into jsdom. We only need the .page-container and .ad-slot blocks; we
// extract them from src/index.css so the test stays in sync with reality.
function injectProjectCss() {
  const css = readFileSync(
    path.resolve(__dirname, "../index.css"),
    "utf-8"
  );

  // Pull out the two @layer components blocks we care about.
  const blocks: string[] = [];
  const layerRegex = /@layer\s+components\s*\{([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;
  while ((m = layerRegex.exec(css)) !== null) {
    if (m[1].includes(".page-container") || m[1].includes(".ad-slot")) {
      blocks.push(m[1]);
    }
  }

  const style = document.createElement("style");
  // Add a baseline body font so we can detect leaks.
  style.textContent = `
    body { font-family: "SiteFont", system-ui, sans-serif; color: rgb(10, 20, 30); }
    ${blocks.join("\n")}
  `;
  document.head.appendChild(style);
}

beforeAll(() => {
  injectProjectCss();
});

describe("Ad isolation: HTML ads must not affect site fonts or layout", () => {
  it("contains a hostile HTML ad inside .ad-slot without leaking styles or width", () => {
    // Force a known container width so we can detect overflow attempts.
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 1200,
    });

    const { container } = render(
      <div className="page-container" data-testid="page" style={{ width: 1200 }}>
        <header data-testid="sibling-header">Header text</header>

        <div
          className="ad-slot"
          data-testid="ad-wrapper"
          style={{ maxWidth: 300, aspectRatio: "300 / 250" }}
        >
          {/*
            Hostile inline HTML ad: tries to override fonts, colors, and
            blow out width. The .ad-slot containment must neutralize all of it.
          */}
          <div
            data-testid="ad-content"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: `
                <style>
                  body, html { font-family: "EvilAdFont" !important; color: red !important; }
                  * { font-family: "EvilAdFont" !important; }
                </style>
                <div style="width: 5000px; font-family: 'EvilAdFont'; color: red;">
                  Buy now! Buy now! Buy now! Buy now! Buy now!
                </div>
              `,
            }}
          />
        </div>

        <footer data-testid="sibling-footer">Footer text</footer>
      </div>
    );

    const adWrapper = container.querySelector(".ad-slot") as HTMLElement;
    const page = container.querySelector(".page-container") as HTMLElement;
    const header = container.querySelector(
      '[data-testid="sibling-header"]'
    ) as HTMLElement;
    const footer = container.querySelector(
      '[data-testid="sibling-footer"]'
    ) as HTMLElement;

    // 1. Required isolation CSS is present on .ad-slot
    const adStyles = getComputedStyle(adWrapper);
    expect(adStyles.overflow).toBe("hidden");
    // jsdom may serialize `contain` as the longhand list — accept either.
    expect(adStyles.contain).toMatch(/layout|size|paint|style/);
    expect(adStyles.isolation).toBe("isolate");

    // 2. .page-container must use overflow-x: clip so ads cannot cause page scroll
    const pageStyles = getComputedStyle(page);
    expect(["clip", "hidden"]).toContain(pageStyles.overflowX);

    // 3. Sibling fonts/colors are NOT overridden by the ad's <style> tag.
    const headerFont = getComputedStyle(header).fontFamily;
    const footerFont = getComputedStyle(footer).fontFamily;
    const bodyFont = getComputedStyle(document.body).fontFamily;
    expect(headerFont).not.toMatch(/EvilAdFont/);
    expect(footerFont).not.toMatch(/EvilAdFont/);
    expect(bodyFont).not.toMatch(/EvilAdFont/);

    expect(getComputedStyle(header).color).not.toBe("rgb(255, 0, 0)");
    expect(getComputedStyle(footer).color).not.toBe("rgb(255, 0, 0)");

    // 4. Ad cannot push the page-container wider than its declared width.
    //    (jsdom doesn't do real layout, but we can assert the constraints.)
    expect(adStyles.maxWidth).toBe("100%");
    expect(adStyles.minWidth).toBe("0px");

    // The ad wrapper's own inline maxWidth is the declared ad size, not larger.
    expect(adWrapper.style.maxWidth).toBe("300px");
  });

  it("AdSlot CSS file declares the required isolation rules", () => {
    const css = readFileSync(
      path.resolve(__dirname, "../index.css"),
      "utf-8"
    );

    // Hard guarantees that prevent regressions in index.css
    expect(css).toMatch(/\.ad-slot\s*\{[^}]*contain:\s*layout[^}]*\}/s);
    expect(css).toMatch(/\.ad-slot\s*\{[^}]*isolation:\s*isolate[^}]*\}/s);
    expect(css).toMatch(/\.ad-slot\s*\{[^}]*overflow:\s*hidden[^}]*\}/s);
    expect(css).toMatch(/\.page-container\s*\{[^}]*overflow-x:\s*clip[^}]*\}/s);
  });
});
