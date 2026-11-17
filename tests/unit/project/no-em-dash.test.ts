import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..", "..");
const EM_DASH = String.fromCodePoint(0x2014);
const SCANNED = ["src", "content", "docs", "tests", "tools", ".github", ".vscode"] as const;
const FILES = [
  "index.html",
  "README.md",
  "AGENTS.md",
  "package.json",
  "playwright.config.ts",
  "eslint.config.js",
] as const;

async function filesUnder(folder: string): Promise<string[]> {
  if (!existsSync(join(root, folder))) return [];
  const found: string[] = [];
  for await (const path of new Bun.Glob(`${folder}/**/*`).scan({ cwd: root, onlyFiles: true })) {
    found.push(path.replaceAll("\\", "/"));
  }
  return found;
}

test("no file of the project contains an em dash", async () => {
  const folders = await Promise.all(SCANNED.map(filesUnder));
  const paths = [...folders.flat(), ...FILES.filter((file) => existsSync(join(root, file)))];
  expect(paths.length).toBeGreaterThan(1);
  const offenders: string[] = [];
  for (const path of paths) {
    const lines = (await Bun.file(join(root, path)).text()).split("\n");
    lines.forEach((line, index) => {
      if (line.includes(EM_DASH)) offenders.push(`${path}:${index + 1}`);
    });
  }
  expect(offenders).toEqual([]);
});
