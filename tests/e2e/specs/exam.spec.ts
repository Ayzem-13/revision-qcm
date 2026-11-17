import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, startSession } from "../support.ts";

test("an exam is navigated freely and marked out of 20", async ({ page }) => {
  await startSession(page, "Examen", "10");
  await expect(page.getByTestId("exam-timer")).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText(/^\d{2}:\d{2}$/);
  await expect(page.getByText("Question 1 sur 10")).toBeVisible();

  await page.keyboard.press("Digit1");
  await expect(page.getByTestId("choice-1")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("region", { name: "Correction" })).toHaveCount(0);

  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Question 2 sur 10")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("Question 1 sur 10")).toBeVisible();
  await expect(page.getByTestId("choice-1")).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: /Toutes les questions, 1 répondues sur 10/ }).click();
  const sheet = page.getByRole("dialog", { name: "Questions" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Question 1, répondue" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Question 1, répondue" })).toHaveAttribute("aria-current", "step");
  await expectAccessible(page);
  await sheet.getByRole("button", { name: "Question 10, sans réponse" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText("Question 10 sur 10")).toBeVisible();

  await page.getByTestId("primary-action").click();
  const confirm = page.getByRole("alertdialog", { name: "Terminer l'examen ?" });
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText("9 questions sont encore sans réponse");
  await confirm.getByRole("button", { name: "Terminer" }).click();

  await expect(page.getByRole("img", { name: /^Note : .* sur 20/ })).toBeVisible();
  await page.getByRole("radio", { name: /Toutes/ }).click();
  await expect(page.getByRole("heading", { name: "Correction complète" })).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test("quitting and restarting a session ask first", async ({ page }) => {
  await startSession(page, "Examen", "10");
  await page.getByRole("button", { name: "Recommencer la session" }).click();
  const restart = page.getByRole("alertdialog", { name: "Recommencer la session ?" });
  await expect(restart).toBeVisible();
  await restart.getByRole("button", { name: "Annuler" }).click();
  await expect(restart).toBeHidden();

  await page.getByRole("button", { name: "Quitter la session" }).click();
  const quit = page.getByRole("alertdialog", { name: "Quitter la session ?" });
  await expect(quit).toBeVisible();
  await quit.getByRole("button", { name: "Quitter" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Administration Linux" })).toBeVisible();
  await expectNoHorizontalScroll(page);
});
