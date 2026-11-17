import { describe, expect, test } from "bun:test";
import { blockBody, darkScope, declarationsOf, lightScope, stylesheet } from "./stylesheet";

const SHADCN_VARIABLES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;

const ADDITIONS = [
  "destructive-foreground",
  "tertiary",
  "tertiary-foreground",
  "success",
  "success-foreground",
  "overlay",
] as const;

const themeInline = declarationsOf("@theme inline");
const dark = declarationsOf(".dark,\n.dark [data-hue]");

describe("src/index.css follows the shadcn theming convention", () => {
  test("sections come in the documented order", () => {
    const positions = [
      stylesheet.indexOf("@layer ui-sdk;"),
      stylesheet.indexOf('@import "tailwindcss";'),
      stylesheet.indexOf("@custom-variant dark"),
      stylesheet.indexOf("@theme inline {"),
      stylesheet.indexOf(":root,\n[data-hue] {"),
      stylesheet.indexOf(".dark,\n.dark [data-hue] {"),
      stylesheet.indexOf("@layer base {"),
    ];
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(stylesheet.startsWith("@layer ui-sdk;")).toBe(true);
  });

  test("every shadcn variable and every addition is declared in light and dark and mapped in @theme inline", () => {
    const missing: string[] = [];
    for (const name of [...SHADCN_VARIABLES, ...ADDITIONS]) {
      if (!lightScope.has(`--${name}`)) missing.push(`:root --${name}`);
      if (!dark.has(`--${name}`)) missing.push(`.dark --${name}`);
      if (themeInline.get(`--color-${name}`) !== `var(--${name})`) missing.push(`@theme --color-${name}`);
    }
    expect(missing).toEqual([]);
    expect(lightScope.has("--radius")).toBe(true);
  });

  test("@theme inline maps colours only to variables of the two schemes", () => {
    const colours = [...themeInline.entries()].filter(([name]) => name.startsWith("--color-"));
    const strays = colours.filter(([name, value]) => {
      const variable = `--${name.slice("--color-".length)}`;
      return value !== `var(${variable})` || !lightScope.has(variable) || !darkScope.has(variable);
    });
    expect(strays).toEqual([]);
  });

  test("an added colour comes with its foreground", () => {
    const bases = ADDITIONS.filter((name) => !name.endsWith("-foreground") && name !== "overlay");
    for (const base of bases) expect(lightScope.has(`--${base}-foreground`)).toBe(true);
  });

  test("there is no second vocabulary and one custom utility", () => {
    expect(stylesheet).not.toContain("--md-");
    expect(stylesheet.match(/@utility /g)?.length).toBe(1);
    expect(stylesheet).not.toMatch(/--text-[a-z-]+:/);
  });

  test("the scrollbar gutter is stable and a scroll lock adds no compensation", () => {
    const base = blockBody("@layer base");
    expect(base).toMatch(/html \{[^}]*overflow-y: scroll;[^}]*scrollbar-gutter: stable;/);
    expect(base).toMatch(
      /body\[data-scroll-locked\] \{[^}]*margin-right: 0 !important;[^}]*padding-right: 0 !important;/,
    );
  });
});
