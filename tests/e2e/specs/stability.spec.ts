import { expect, test } from "@playwright/test";
import {
  bringIntoView,
  expectNoHorizontalScroll,
  expectNothingMoves,
  layoutOf,
  movements,
  openSubject,
  startSession,
} from "../support.ts";

const QUESTION_PARTS = ["question", "choice-", "answer-choices"] as const;

test("choosing chapters, a mode and a count moves nothing on the setup screen", async ({ page }) => {
  await openSubject(page);
  const toggleAll = page.getByTestId("toggle-all");
  await bringIntoView(toggleAll);
  await expectNothingMoves(page, () => toggleAll.click());
  await expectNothingMoves(page, () => toggleAll.click());

  const sectionCheckbox = page.getByTestId("section-1").getByRole("checkbox").first();
  await bringIntoView(sectionCheckbox);
  await expectNothingMoves(page, () => sectionCheckbox.click());
  await expectNothingMoves(page, () => sectionCheckbox.click());

  const exam = page.getByRole("radio", { name: "Examen" });
  await bringIntoView(exam);
  await expectNothingMoves(page, () => exam.click());
  const ten = page.getByRole("radio", { name: "10 questions" });
  await bringIntoView(ten);
  await expectNothingMoves(page, () => ten.click());
  await expectNoHorizontalScroll(page);
});

test("the theme menu and the reset dialog open and close without moving the page", async ({ page }) => {
  await openSubject(page);
  await expectNothingMoves(page, async () => {
    await page.getByTestId("theme-toggle").click();
    await expect(page.getByRole("menu")).toBeVisible();
  });
  await expectNothingMoves(page, async () => {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
  });
  await expectNothingMoves(page, async () => {
    await page.getByRole("button", { name: /Réinitialiser/ }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
  });
  await expectNothingMoves(page, async () => {
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByRole("alertdialog")).toBeHidden();
  });
});

test("selecting, revealing and folding the correction move nothing and scroll nothing", async ({ page }) => {
  await startSession(page, "Entraînement", "10");
  await expectNothingMoves(page, () => page.keyboard.press("Digit1"));
  await expectNothingMoves(page, async () => {
    await page.getByTestId("primary-action").click();
    await expect(page.getByRole("region", { name: "Correction" })).toBeVisible();
  });
  await expectNothingMoves(page, () => page.getByTestId("correction-toggle").click());
  await expectNothingMoves(page, () => page.getByTestId("correction-toggle").click());
  await expectNothingMoves(page, () => page.getByTestId("primary-action").click(), QUESTION_PARTS);
  await expect(page.getByText("Question 2 sur 10")).toBeVisible();
});

test("every confirmation dialog of a session opens and closes without moving the page", async ({ page }) => {
  await startSession(page, "Entraînement", "10");
  for (const [name, cancel] of [
    ["Quitter la session", "Rester"],
    ["Recommencer la session", "Annuler"],
  ] as const) {
    await expectNothingMoves(page, async () => {
      await page.getByRole("button", { name }).click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
    });
    await expectNothingMoves(page, async () => {
      await page.getByRole("button", { name: cancel }).click();
      await expect(page.getByRole("alertdialog")).toBeHidden();
    });
  }
});

test("the exam navigator opens, and moving between questions keeps the frame still", async ({ page }) => {
  await startSession(page, "Examen", "10");
  await expectNothingMoves(page, () => page.keyboard.press("Digit2"));
  await expectNothingMoves(page, () => page.keyboard.press("ArrowRight"), QUESTION_PARTS);
  await expectNothingMoves(page, async () => {
    await page.getByTestId("navigator").click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
  await expectNothingMoves(page, async () => {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test("no screen overflows sideways", async ({ page }) => {
  await page.goto("/");
  expect(movements(await layoutOf(page), await layoutOf(page))).toEqual([]);
  await openSubject(page);
  expect(movements(await layoutOf(page), await layoutOf(page))).toEqual([]);
  await startSession(page, "Examen", "10");
  expect(movements(await layoutOf(page), await layoutOf(page))).toEqual([]);
});
