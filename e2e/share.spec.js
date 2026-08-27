import { test, expect } from "@playwright/test";

test("restores state from share hash", async ({ page }) => {
  const payload = encodeURIComponent(
    JSON.stringify({
      v: 1,
      t: 5,
      m: "mixolydian",
      s: "bebop",
      b: 4,
      i: 60,
      bp: 120,
      sd: 777,
    })
  );
  await page.goto("/#s=" + payload);
  await expect(page.locator(".style-btn[data-style='bebop']")).toHaveClass(/active/);
  await expect(page.locator("#phraseMeta")).toContainText("Seed 777");
});
