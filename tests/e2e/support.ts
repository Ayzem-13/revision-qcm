import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

const SUBJECT_PATH = "/#/admin-linux";

type Box = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

type Layout = {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly scrollWidth: number;
  readonly clientWidth: number;
  readonly boxes: Readonly<Record<string, Box>>;
};

const TOLERANCE_PX = 0.5;

export async function expectAccessible(page: Page): Promise<void> {
  await settled(page);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const found = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target.join(" ")),
  }));
  expect(found).toEqual([]);
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

export async function settled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().endTime !== Number.POSITIVE_INFINITY);
    await Promise.all(finite.map((animation) => animation.finished.catch(() => undefined)));
    const snapshot = (): string =>
      [...document.querySelectorAll<HTMLElement>("[data-testid]")]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return `${element.dataset["testid"] ?? ""}:${rect.x.toFixed(1)},${rect.y.toFixed(1)},${rect.width.toFixed(1)},${rect.height.toFixed(1)}`;
        })
        .join("|") + `|${window.scrollY}`;
    const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    let previous = snapshot();
    let still = 0;
    for (let index = 0; index < 300 && still < 12; index++) {
      await frame();
      const next = snapshot();
      still = next === previous ? still + 1 : 0;
      previous = next;
    }
  });
}

export async function layoutOf(page: Page): Promise<Layout> {
  await settled(page);
  return page.evaluate(() => {
    const boxes: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const element of document.querySelectorAll<HTMLElement>("header [data-testid], main [data-testid]")) {
      if (element.closest("[role=dialog], [role=alertdialog], [data-slot=action-bar-panel]") !== null) continue;
      if (element.getClientRects().length === 0) continue;
      const rect = element.getBoundingClientRect();
      boxes[element.dataset["testid"] ?? ""] = {
        x: rect.x + window.scrollX,
        y: rect.y + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
    }
    const root = document.documentElement;
    return {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      boxes,
    };
  });
}

export function movements(before: Layout, after: Layout, ignored: readonly string[] = []): string[] {
  const found: string[] = [];
  if (Math.abs(before.scrollY - after.scrollY) > TOLERANCE_PX)
    found.push(`page scrolled by ${after.scrollY - before.scrollY}px`);
  if (after.scrollWidth > after.clientWidth)
    found.push(`page overflows sideways by ${after.scrollWidth - after.clientWidth}px`);
  if (Math.abs(before.clientWidth - after.clientWidth) > TOLERANCE_PX) {
    found.push(`viewport width changed by ${after.clientWidth - before.clientWidth}px`);
  }
  for (const [id, box] of Object.entries(before.boxes)) {
    if (ignored.some((prefix) => id.startsWith(prefix))) continue;
    const next = after.boxes[id];
    if (next === undefined) continue;
    for (const key of ["x", "y", "width", "height"] as const) {
      const delta = next[key] - box[key];
      if (Math.abs(delta) > TOLERANCE_PX) found.push(`${id}.${key} moved by ${delta.toFixed(1)}px`);
    }
  }
  return found;
}

export async function expectNothingMoves(
  page: Page,
  interaction: () => Promise<void>,
  ignored: readonly string[] = [],
): Promise<void> {
  const before = await layoutOf(page);
  await interaction();
  const after = await layoutOf(page);
  expect(movements(before, after, ignored)).toEqual([]);
}

export async function bringIntoView(target: Locator): Promise<void> {
  await target.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await settled(target.page());
}

export async function openSubject(page: Page): Promise<void> {
  await page.goto(SUBJECT_PATH);
  await expect(page.getByRole("heading", { level: 1, name: "Administration Linux" })).toBeVisible();
}

export async function startSession(
  page: Page,
  mode: "Entraînement" | "Examen",
  count: "10" | "20" | "40",
): Promise<void> {
  await openSubject(page);
  await page.getByRole("radio", { name: mode }).click();
  await page.getByRole("radio", { name: `${count} questions` }).click();
  await page.getByRole("button", { name: "Commencer" }).click();
  await expect(page.getByTestId("answer-choices")).toBeVisible();
}
