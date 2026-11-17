import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { darkScope, lightScope, root, type Declarations } from "./stylesheet";

type Rgb = readonly [number, number, number];
type Oklch = { readonly l: number; readonly c: number; readonly h: number };

function resolve(value: string, scope: Declarations, hue: number): string {
  let current = value;
  for (let depth = 0; depth < 8 && current.includes("var(--"); depth++) {
    current = current.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
      if (name === "--hue") return String(hue);
      const next = scope.get(name);
      if (next === undefined) throw new Error(`unknown variable ${name}`);
      return next;
    });
  }
  return current.replace(/calc\(([-\d.]+) \+ ([-\d.]+)\)/g, (_, a: string, b: string) => String(Number(a) + Number(b)));
}

function parseOklch(value: string): Oklch {
  const match = /^oklch\(([\d.]+) ([\d.]+) ([-\d.]+)\)$/.exec(value);
  if (match === null) throw new Error(`not an opaque oklch colour: ${value}`);
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

function linearSrgb(color: Oklch): Rgb {
  const radians = (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(radians);
  const b = color.c * Math.sin(radians);
  const l = (color.l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (color.l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (color.l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

function clampRgb(rgb: Rgb): Rgb {
  return [clamp(rgb[0]), clamp(rgb[1]), clamp(rgb[2])];
}

function inGamut(rgb: Rgb): boolean {
  return rgb.every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4);
}

const gamutMappings = {
  clip: (color: Oklch): Rgb => clampRgb(linearSrgb(color)),
  chroma: (color: Oklch): Rgb => {
    if (inGamut(linearSrgb(color))) return clampRgb(linearSrgb(color));
    let low = 0;
    let high = color.c;
    for (let step = 0; step < 24; step++) {
      const mid = (low + high) / 2;
      if (inGamut(linearSrgb({ ...color, c: mid }))) low = mid;
      else high = mid;
    }
    return clampRgb(linearSrgb({ ...color, c: low }));
  },
} as const;

function encode(channel: number): number {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function decode(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function over(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  const mix = (index: 0 | 1 | 2): number => decode(alpha * encode(top[index]) + (1 - alpha) * encode(bottom[index]));
  return [mix(0), mix(1), mix(2)];
}

function luminance(rgb: Rgb): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrast(a: Rgb, b: Rgb): number {
  const [high = 0, low = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

type Scheme = "light" | "dark";

type Paint = { readonly token: string; readonly alpha: number; readonly schemes: readonly Scheme[] };

const SURFACES = ["background", "card", "popover", "muted", "accent"] as const;

async function tintsUsedByVariants(): Promise<readonly Paint[]> {
  const tints = new Map<string, Paint>();
  for await (const file of new Bun.Glob("src/components/ui/*.tsx").scan(root)) {
    const source = await Bun.file(join(root, file)).text();
    for (const match of source.matchAll(/(?:^|[\s"'`])((?:[^\s:"'`]+:)*)bg-([a-z]+(?:-[a-z]+)*)\/(\d+)(?![\w-])/g)) {
      const [, prefix = "", token = "", percent = "0"] = match;
      const schemes: readonly Scheme[] = prefix.includes("dark:") ? ["dark"] : ["light", "dark"];
      const key = `${token}/${percent}/${schemes.join()}`;
      tints.set(key, { token, alpha: Number(percent) / 100, schemes });
    }
  }
  return [...tints.values()].filter((tint) => tint.token !== "overlay" && tint.token !== "foreground");
}

const tints = await tintsUsedByVariants();
const hues = Array.from({ length: 12 }, (_, index) => index * 30);
const schemes: Readonly<Record<Scheme, Declarations>> = { light: lightScope, dark: darkScope };

function textPairs(scope: Declarations, scheme: Scheme): readonly (readonly [string, Paint, string | null])[] {
  const pairs: (readonly [string, Paint, string | null])[] = [];
  for (const name of scope.keys()) {
    if (!name.endsWith("-foreground")) continue;
    const base = name.slice(2, -"-foreground".length);
    if (scope.has(`--${base}`)) pairs.push([name.slice(2), { token: base, alpha: 1, schemes: [scheme] }, null]);
  }
  for (const text of ["foreground", "muted-foreground"]) {
    for (const surface of SURFACES) pairs.push([text, { token: surface, alpha: 1, schemes: [scheme] }, null]);
  }
  for (const tint of tints.filter(
    (candidate) => candidate.schemes.includes(scheme) && scope.has(`--${candidate.token}`),
  )) {
    for (const surface of ["background", "card"]) {
      if (tint.alpha >= 0.5) {
        if (scope.has(`--${tint.token}-foreground`)) pairs.push([`${tint.token}-foreground`, tint, surface]);
        continue;
      }
      pairs.push(["foreground", tint, surface]);
      pairs.push(["muted-foreground", tint, surface]);
      if (tint.token === "destructive") pairs.push([tint.token, tint, surface]);
    }
  }
  return pairs;
}

describe("theme contrast", () => {
  test("the variants of components/ui use alpha tints that this test can see", () => {
    expect(tints.length).toBeGreaterThan(0);
  });

  for (const schemeName of ["light", "dark"] as const) {
    const scope = schemes[schemeName];
    for (const [mappingName, map] of Object.entries(gamutMappings)) {
      test(`${schemeName}: every text pair reaches WCAG AA for every sampled hue, gamut ${mappingName}`, () => {
        const paint = (token: string, hue: number): Rgb =>
          map(parseOklch(resolve(scope.get(`--${token}`) ?? "", scope, hue)));
        const failures: string[] = [];
        for (const hue of hues) {
          for (const [text, behind, under] of textPairs(scope, schemeName)) {
            const fill = paint(behind.token, hue);
            const background = under === null ? fill : over(fill, behind.alpha, paint(under, hue));
            const ratio = contrast(paint(text, hue), background);
            if (ratio < 4.5) {
              const where = under === null ? behind.token : `${behind.token}/${behind.alpha * 100} over ${under}`;
              failures.push(`hue ${hue}: ${text} on ${where} = ${ratio.toFixed(2)}`);
            }
          }
        }
        expect(failures).toEqual([]);
      });

      test(`${schemeName}: borders that outline a control reach 3:1 on the page, gamut ${mappingName}`, () => {
        const failures: string[] = [];
        for (const hue of hues) {
          const page = map(parseOklch(resolve(scope.get("--background") ?? "", scope, hue)));
          for (const edge of ["input", "ring", "primary"]) {
            const ratio = contrast(map(parseOklch(resolve(scope.get(`--${edge}`) ?? "", scope, hue))), page);
            if (ratio < 3) failures.push(`hue ${hue}: ${edge} on background = ${ratio.toFixed(2)}`);
          }
        }
        expect(failures).toEqual([]);
      });
    }
  }
});
