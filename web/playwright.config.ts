import { defineConfig, devices } from "@playwright/test"

// Browser tests of the main journey, against the agent's real server with
// the built dashboard and the made-up demo (no API key). `pnpm build`, then
// `pnpm e2e`: the server is started with a fresh demo database.
const port = 4319

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "retain-on-failure" },
  webServer: {
    command: `cd .. && rm -f data/e2e.db* && pnpm -s cli load-demo --db data/e2e.db && PORT=${port} ANTHROPIC_API_KEY= GOOGLE_PLAY_CREDENTIALS= pnpm -s cli serve --db data/e2e.db`,
    url: `http://127.0.0.1:${port}/api/settings`,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: process.env.CHROMIUM_PATH },
      },
    },
  ],
})
