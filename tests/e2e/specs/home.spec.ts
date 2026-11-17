import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, startSession } from "../support.ts";

test("the home screen lists the subjects and opens one", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Qu'est-ce qu'on révise ?");
  const subject = page.getByRole("link", { name: /Administration Linux/ });
  await expect(subject).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  await subject.click();
  await expect(page.getByRole("heading", { level: 1, name: "Administration Linux" })).toBeVisible();
  await page.getByRole("link", { name: "Retour aux matières" }).click();
  await expect(subject).toBeVisible();
});

test("an ongoing session is offered again from the home screen", async ({ page }) => {
  await startSession(page, "Entraînement", "10");
  await page.getByRole("link", { name: "Retour aux matières" }).click();
  const banner = page.getByRole("region", { name: "Session en cours" });
  await expect(banner).toBeVisible();
  await expect(page.getByRole("link", { name: /Administration Linux/ })).toContainText("session en cours");

  await banner.getByRole("link", { name: "Reprendre" }).click();
  await expect(page.getByTestId("answer-choices")).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test("the theme menu switches between light, dark and system", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole("button", { name: /Thème/ }).click();
  await page.getByRole("menuitemradio", { name: "Sombre" }).click();
  await expect(html).toHaveClass(/dark/);
  await expectAccessible(page);

  await page.reload();
  await expect(html).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Thème : Sombre" }).click();
  await page.getByRole("menuitemradio", { name: "Système" }).click();
  await expect(html).not.toHaveClass(/dark/);
  await expectNoHorizontalScroll(page);
});
