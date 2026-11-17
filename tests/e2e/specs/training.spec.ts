import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, openSubject, settled } from "../support.ts";

test("a training session is played with the keyboard only", async ({ page }) => {
  await openSubject(page);
  await page.getByRole("radio", { name: "Entraînement" }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("radio", { name: "10 questions" }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Commencer" }).focus();
  await page.keyboard.press("Enter");

  const choices = page.getByTestId("answer-choices");
  await expect(choices).toBeVisible();
  const primary = page.getByTestId("primary-action");

  for (let question = 1; question <= 10; question++) {
    await expect(page.getByText(`Question ${question} sur 10`)).toBeVisible();
    await expect(primary).toBeDisabled();
    await page.keyboard.press("Digit1");
    await expect(page.getByTestId("choice-1")).toHaveAttribute("aria-checked", "true");
    await expect(primary).toBeEnabled();

    await settled(page);
    const heights = await choices
      .locator("[data-slot=choice]")
      .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
    await page.keyboard.press("Enter");

    const correction = page.getByRole("region", { name: "Correction" });
    await expect(correction).toBeVisible();
    await settled(page);
    const after = await choices
      .locator("[data-slot=choice]")
      .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
    expect(after).toEqual(heights);

    const box = await correction.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (box !== null && viewport !== null) {
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    if (question === 1) await expectAccessible(page);

    await page.keyboard.press("Enter");
  }

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: /bonnes réponses sur 10/ })).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});
