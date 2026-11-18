import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, openSubject } from "../support.ts";

test("a section checkbox selects its chapters and shows a mixed state", async ({ page }) => {
  await openSubject(page);
  const heading = page.getByTestId("chapters-heading");
  await expect(heading).toContainText("24/24");

  const section = page.getByTestId("section-1");
  const parent = section.getByRole("checkbox").first();
  await page.getByTestId("fold-section-1").click();
  const chapters = section.getByRole("listitem").getByRole("checkbox");
  await expect(chapters.first()).toBeVisible();
  const chapterCount = await chapters.count();
  expect(chapterCount).toBeGreaterThan(1);

  await expect(parent).toHaveAttribute("aria-checked", "true");
  await chapters.first().click();
  await expect(parent).toHaveAttribute("aria-checked", "mixed");
  await expect(heading).toContainText("23/24");

  await parent.click();
  await expect(parent).toHaveAttribute("aria-checked", "true");
  await parent.click();
  await expect(parent).toHaveAttribute("aria-checked", "false");
  await expect(heading).toContainText(`${24 - chapterCount}/24`);

  await page.getByRole("button", { name: "Tout sélectionner" }).click();
  await expect(heading).toContainText("24/24");
  await page.getByRole("button", { name: "Tout désélectionner" }).click();
  await expect(heading).toContainText("0/24");
  await expect(page.getByRole("button", { name: "Commencer" })).toBeDisabled();
  await expect(page.getByText("Sélectionnez au moins un chapitre.").filter({ visible: true })).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test("a section starts folded, keeps its selection and unfolds its chapters", async ({ page }) => {
  await openSubject(page);
  const heading = page.getByTestId("chapters-heading");
  const section = page.getByTestId("section-1");
  const fold = page.getByTestId("fold-section-1");
  const chapters = section.getByRole("listitem");

  await expect(fold).toHaveAttribute("aria-expanded", "false");
  await expect(chapters).toHaveCount(0);
  await expect(page.getByTestId("fold-section-3")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("section-3").getByRole("listitem").first()).toBeVisible();
  await expect(heading).toContainText("24/24");
  await section.getByRole("checkbox").first().click();

  await fold.click();
  await expect(fold).toHaveAttribute("aria-expanded", "true");
  await expect(chapters.first()).toBeVisible();
  await expect(chapters.first().getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
  await expect(heading).toContainText(`${24 - (await chapters.count())}/24`);
  await expectAccessible(page);

  await fold.click();
  await expect(chapters.first()).toBeHidden();
});

test("the chapters of the last session are still selected when coming back", async ({ page }) => {
  await openSubject(page);
  const heading = page.getByTestId("chapters-heading");
  await page.getByTestId("section-1").getByRole("checkbox").first().click();
  await page.getByTestId("section-2").getByRole("checkbox").first().click();
  await expect(heading).toContainText("6/24");
  await page.getByRole("button", { name: "Commencer" }).click();
  await expect(page.getByTestId("answer-choices")).toBeVisible();

  await page.getByRole("button", { name: "Quitter la session" }).click();
  await page
    .getByRole("alertdialog", { name: "Quitter la session ?" })
    .getByRole("button", { name: "Quitter" })
    .click();
  await expect(heading).toContainText("6/24");
  await page.reload();
  await expect(heading).toContainText("6/24");
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
  const clipped = await counts
    .getByRole("radio")
    .locator("span")
    .evaluateAll((labels) => labels.filter((label) => label.scrollWidth > label.clientWidth).length);
  expect(clipped).toBe(0);
  await counts.getByRole("radio", { name: "10 questions" }).click();
  await expect(counts.getByRole("radio", { name: "10 questions" })).toHaveAttribute("aria-checked", "true");
  await counts.getByRole("radio", { name: "50 questions" }).click();
  await expect(counts.getByRole("radio", { name: "50 questions" })).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByTestId("start-summary").or(page.getByTestId("start-bar")).filter({ visible: true }),
  ).toContainText("50 questions");
  await counts.getByRole("radio", { name: /^Tout,/ }).click();
  await expect(counts.getByRole("radio", { name: "Tout, 892 questions" })).toHaveAttribute("aria-checked", "true");
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
