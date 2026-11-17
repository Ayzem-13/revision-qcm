import { readFileSync } from "node:fs";
import { join } from "node:path";

export const root = join(import.meta.dir, "..", "..", "..");

export const stylesheet = readFileSync(join(root, "src", "index.css"), "utf8");

export type Declarations = ReadonlyMap<string, string>;

export function blockBody(selector: string): string {
  const start = stylesheet.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`block not found: ${selector}`);
  let depth = 0;
  const open = stylesheet.indexOf("{", start);
  for (let index = open; index < stylesheet.length; index++) {
    const character = stylesheet[index];
    if (character === "{") depth++;
    if (character === "}") depth--;
    if (depth === 0) return stylesheet.slice(open + 1, index);
  }
  throw new Error(`unclosed block: ${selector}`);
}

export function declarationsOf(selector: string): Declarations {
  const declarations = new Map<string, string>();
  for (const line of blockBody(selector).split(";")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const name = line.slice(0, colon).trim();
    if (name.startsWith("--")) declarations.set(name, line.slice(colon + 1).trim());
  }
  return declarations;
}

export const lightScope = declarationsOf(":root,\n[data-hue]");
export const darkScope: Declarations = new Map([...lightScope, ...declarationsOf(".dark,\n.dark [data-hue]")]);
