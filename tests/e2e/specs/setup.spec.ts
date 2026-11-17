import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, openSubject } from "../support.ts";

test("a section checkbox selects its chapters and shows a mixed state", async ({ page }) => {
  await openSubject(page);
  const heading = page.getByTestId("chapters-heading");
  await expect(heading).toContainText("22/22");

  const section = page.getByTestId("section-1");
  const parent = section.getByRole("checkbox").first();
  const chapters = section.getByRole("listitem").getByRole("checkbox");
  const chapterCount = await chapters.count();
  expect(chapterCount).toBeGreaterThan(1);

  await expect(parent).toHaveAttribute("aria-checked", "true");
  await chapters.first().click();
  await expect(parent).toHaveAttribute("aria-checked", "mixed");
  await expect(heading).toContainText("21/22");

  await parent.click();
  await expect(parent).toHaveAttribute("aria-checked", "true");
  await parent.click();
  await expect(parent).toHaveAttribute("aria-checked", "false");
  await expect(heading).toContainText(`${22 - chapterCount}/22`);

  await page.getByRole("button", { name: "Tout sélectionner" }).click();
  await expect(heading).toContainText("22/22");
  await page.getByRole("button", { name: "Tout désélectionner" }).click();
  await expect(heading).toContainText("0/22");
  await expect(page.getByRole("button", { name: "Commencer" })).toBeDisabled();
  await expect(page.getByText("Sélectionnez au moins un chapitre.").filter({ visible: true })).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test("modes and counts are chosen in place, and an empty pool disables its mode", async ({ page }) => {
  await openSubject(page);
  const modes = page.getByRole("radiogroup", { name: "Mode" });
  await expect(modes.getByRole("radio", { name: "Entraînement" })).toHaveAttribute("aria-checked", "true");
  await expect(modes.getByRole("radio", { name: "Refaire mes erreurs" })).toBeDisabled();

  await modes.getByRole("radio", { name: "Examen" }).click();
  await expect(modes.getByRole("radio", { name: "Examen" })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowUp");
  await expect(modes.getByRole("radio", { name: "Entraînement" })).toHaveAttribute("aria-checked", "true");

  const counts = page.getByRole("radiogroup", { name: "Nombre de questions" });
  await counts.getByRole("radio", { name: "10 questions" }).click();
  await expect(counts.getByRole("radio", { name: "10 questions" })).toHaveAttribute("aria-checked", "true");
  await counts.getByRole("radio", { name: /^Tout,/ }).click();
  await expect(counts.getByRole("radio", { name: "Tout, 792 questions" })).toHaveAttribute("aria-checked", "true");
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test("progress can be reset from the subject screen", async ({ page }) => {
  await openSubject(page);
  await page.getByRole("button", { name: /Réinitialiser/ }).click();
  const dialog = page.getByRole("alertdialog", { name: "Réinitialiser la progression ?" });
  await expect(dialog).toBeVisible();
  await expectAccessible(page);
  await dialog.getByRole("button", { name: "Annuler" }).click();
  await expect(dialog).toBeHidden();
  await expectNoHorizontalScroll(page);
});
