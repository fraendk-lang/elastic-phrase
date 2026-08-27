import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:3344",
  },
  webServer: {
    command: "npx serve . -p 3344",
    url: "http://127.0.0.1:3344",
    reuseExistingServer: !process.env.CI,
  },
});
