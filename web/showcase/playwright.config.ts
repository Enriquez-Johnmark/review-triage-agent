import { defineConfig } from "@playwright/test"

// Screenshots and the walkthrough video, written to docs/showcase/. Not
// tests: run them on purpose (`pnpm showcase`, after `pnpm build`). The
// server starts with a fresh made-up demo, sorted by Claude as recorded, and
// the owner's API key (`.env`, or OWNER_ANTHROPIC_API_KEY), so Claude drafts
// the replies live.
const port = 4320

export default defineConfig({
  testDir: ".",
  testMatch: "*.showcase.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 5 * 60_000,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  webServer: {
    command: `cd ../.. && rm -f data/showcase.db* && pnpm -s cli load-demo --db data/showcase.db && PORT=${port} GOOGLE_PLAY_CREDENTIALS= SUMMARY_TOKEN= pnpm -s cli serve --db data/showcase.db`,
    url: `http://127.0.0.1:${port}/api/settings`,
    reuseExistingServer: false,
  },
})
