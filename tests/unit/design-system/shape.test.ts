import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { root, stylesheet } from "./stylesheet";

async function classStrings(): Promise<readonly { readonly where: string; readonly classes: string }[]> {
  const found: { where: string; classes: string }[] = [];
  for await (const file of new Bun.Glob("src/**/*.{ts,tsx}").scan(root)) {
    const source = await Bun.file(join(root, file)).text();
    for (const match of source.matchAll(/"([^"\n]*rounded-[^"\n]*)"/g)) {
      const line = source.slice(0, match.index).split("\n").length;
      found.push({ where: `${file.replaceAll("\\", "/")}:${line}`, classes: match[1] ?? "" });
    }
  }
  return found;
}

const strings = await classStrings();

describe("animated shapes", () => {
  test("class strings with a radius exist to be checked", () => {
    expect(strings.length).toBeGreaterThan(0);
  });

  test("no state morphs to an infinite radius", () => {
    const offenders = strings
      .filter(({ classes }) => /\S:rounded-full(?![\w-])/.test(classes))
      .map(({ where }) => where);
    expect(offenders).toEqual([]);
  });

  test("no state morphs away from an infinite radius", () => {
    const offenders = strings
      .filter(({ classes }) => /(?:^|\s)rounded-full(?![\w-])/.test(classes) && /\S:rounded-(?!full)/.test(classes))
      .map(({ where }) => where);
    expect(offenders).toEqual([]);
  });

  test("no easing in index.css overshoots", () => {
    const beziers = [...stylesheet.matchAll(/cubic-bezier\(([^)]*)\)/g)].map((match) =>
      (match[1] ?? "").split(",").map(Number),
    );
    expect(beziers.length).toBeGreaterThan(0);
    for (const [, y1 = 0, , y2 = 0] of beziers) {
      expect(y1).toBeGreaterThanOrEqual(0);
      expect(y1).toBeLessThanOrEqual(1);
      expect(y2).toBeGreaterThanOrEqual(0);
      expect(y2).toBeLessThanOrEqual(1);
    }
    expect(stylesheet).not.toContain("linear(");
  });
});
