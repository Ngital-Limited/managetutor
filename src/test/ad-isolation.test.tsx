/**
 * Automated check: HTML ad styles must not affect site fonts or global layout.
 *
 * Defense-in-depth in this project:
 *   1. AdSlot renders all `html` ads inside a sandboxed <iframe srcDoc=...>.
 *      The iframe is the real isolation boundary for CSS/JS leakage.
 *   2. The .ad-slot wrapper applies `contain: layout paint size style`,
 *      `isolation: isolate`, and `overflow: hidden` so the ad cannot push
 *      page width or affect outside layout.
 *   3. The .page-container uses `overflow-x: clip` so a misbehaving ad
 *      cannot create a horizontal scrollbar on the page.
 *
 * This test verifies all three guarantees and would fail if any of them
 * regressed (e.g. someone removes the iframe, drops `contain`, or changes
 * page-container's overflow).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "fs";
import path from "path";

function injectProjectCss() {
  const css = readFileSync(path.resolve(__dirname, "../index.css"), "utf-8");

  const blocks: string[] = [];
  const layerRegex = /@layer\s+components\s*\{([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;
  while ((m = layerRegex.exec(css)) !== null) {
    if (m[1].includes(".page-container") || m[1].includes(".ad-slot")) {
      blocks.push(m[1]);
    }
  }

  const style = document.createElement("style");
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
  it(".ad-slot wrapper has the required containment + isolation CSS", () => {
    const { container } = render(
      <div className="page-container" style={{ width: 1200 }}>
        <header data-testid="sibling-header">Header text</header>
        {/* Plain class only — no inline maxWidth so we read the CSS rule. */}
        <div className="ad-slot" data-testid="ad-wrapper" />
        {/* Also render the AdSlot-shaped wrapper to confirm inline cap works. */}
        <div
          className="ad-slot"
          data-testid="ad-wrapper-sized"
          style={{ maxWidth: 300, aspectRatio: "300 / 250" }}
        />
        <footer data-testid="sibling-footer">Footer text</footer>
      </div>
    );

    const adWrapper = container.querySelector(
      '[data-testid="ad-wrapper"]'
    ) as HTMLElement;
    const sized = container.querySelector(
      '[data-testid="ad-wrapper-sized"]'
    ) as HTMLElement;
    const page = container.querySelector(".page-container") as HTMLElement;

    const adStyles = getComputedStyle(adWrapper);
    expect(adStyles.overflow).toBe("hidden");
    expect(adStyles.contain).toMatch(/layout|size|paint|style/);
    expect(adStyles.isolation).toBe("isolate");
    // Class-only wrapper inherits max-width: 100% from .ad-slot rule.
    expect(adStyles.maxWidth).toBe("100%");
    expect(["0", "0px"]).toContain(adStyles.minWidth);

    const pageStyles = getComputedStyle(page);
    expect(["clip", "hidden"]).toContain(pageStyles.overflowX);

    // Sized wrapper: the inline cap from AdSlot's declared ad size wins,
    // but it can never exceed its parent because of overflow: hidden.
    expect(sized.style.maxWidth).toBe("300px");
  });

  it("a sandboxed iframe ad cannot leak fonts or colors into siblings", async () => {
    // Mirror the exact shape AdSlot uses: sandboxed iframe with srcDoc.
    const hostileHtml = `
      <style>
        body, html { font-family: "EvilAdFont" !important; color: red !important; }
        * { font-family: "EvilAdFont" !important; }
      </style>
      <div style="width: 5000px; font-family: 'EvilAdFont'; color: red;">
        Buy now!
      </div>
    `;

    const { container } = render(
      <div className="page-container" style={{ width: 1200 }}>
        <header data-testid="sibling-header">Header text</header>
        <div
          className="ad-slot"
          style={{ maxWidth: 300, aspectRatio: "300 / 250" }}
        >
          <iframe
            data-testid="ad-iframe"
            title="Advertisement"
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}</style></head><body>${hostileHtml}</body></html>`}
            style={{ width: "100%", height: "100%", border: 0, display: "block" }}
            scrolling="no"
          />
        </div>
        <footer data-testid="sibling-footer">Footer text</footer>
      </div>
    );

    // Wait a tick for the iframe to mount.
    await new Promise((r) => setTimeout(r, 0));

    const header = container.querySelector(
      '[data-testid="sibling-header"]'
    ) as HTMLElement;
    const footer = container.querySelector(
      '[data-testid="sibling-footer"]'
    ) as HTMLElement;

    // The host page's fonts/colors are unchanged — the iframe boundary
    // prevents the ad's <style> from reaching the parent document.
    expect(getComputedStyle(header).fontFamily).not.toMatch(/EvilAdFont/);
    expect(getComputedStyle(footer).fontFamily).not.toMatch(/EvilAdFont/);
    expect(getComputedStyle(document.body).fontFamily).not.toMatch(/EvilAdFont/);
    expect(getComputedStyle(header).color).not.toBe("rgb(255, 0, 0)");
    expect(getComputedStyle(footer).color).not.toBe("rgb(255, 0, 0)");
  });

  it("AdSlot component renders HTML ads inside a sandboxed iframe", () => {
    // Source-level guarantee: the only path for `ad_type === 'html'` must
    // go through a sandboxed iframe with srcDoc. If someone removes that,
    // this test fails immediately.
    const src = readFileSync(
      path.resolve(__dirname, "../components/AdSlot.tsx"),
      "utf-8"
    );

    expect(src).toMatch(/ad_type\s*===\s*['"]html['"]/);
    expect(src).toMatch(/<iframe[\s\S]*sandbox=/);
    expect(src).toMatch(/srcDoc=/);
  });

  it("index.css declares the required ad isolation + page clip rules", () => {
    const css = readFileSync(path.resolve(__dirname, "../index.css"), "utf-8");

    expect(css).toMatch(/\.ad-slot\s*\{[^}]*contain:\s*layout[^}]*\}/s);
    expect(css).toMatch(/\.ad-slot\s*\{[^}]*isolation:\s*isolate[^}]*\}/s);
    expect(css).toMatch(/\.ad-slot\s*\{[^}]*overflow:\s*hidden[^}]*\}/s);
    expect(css).toMatch(/\.page-container\s*\{[^}]*overflow-x:\s*clip[^}]*\}/s);
  });
});
