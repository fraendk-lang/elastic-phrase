import { test, expect } from "@playwright/test";

test("loads phrase shell and generates notes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Phrase");
  await page.click("#generateBtn");
  await expect(page.locator("#exportMidiBtn")).toBeEnabled();
  await expect(page.locator("#playBtn")).toBeEnabled();
  await expect(page.locator("#phraseMeta")).toContainText("Noten");
});

test("imports composer handoff hash", async ({ page }) => {
  const payload = encodeURIComponent(
    JSON.stringify({ b: 100, p: [{ r: 0, q: "m", b: 0 }, { r: 7, q: "7", b: 7 }] })
  );
  await page.goto("/?from=composer&bpm=100#c=" + payload);
  await expect(page.locator("#importBanner")).toBeVisible();
  await expect(page.locator(".chord-chip")).toHaveCount(2);
  await expect(page.locator("#phraseMeta")).toContainText("akkordbewusst");
});
