import { test, expect } from "@playwright/test";

test("loads phrase shell and generates notes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Phrase");
  await page.click("#generateBtn");
  await expect(page.locator("#exportMidiBtn")).toBeEnabled();
  await expect(page.locator("#phraseMeta")).toContainText("Noten");
});
