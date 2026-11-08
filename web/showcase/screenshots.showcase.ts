import { test, type Browser, type Page } from "@playwright/test"

import { OUT } from "./support.ts"

const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true }
const SUPPORT = "Message us in the app: Help > Chat."

async function open(browser: Browser, baseURL: string | undefined, size: typeof desktop) {
  const context = await browser.newContext({ baseURL, ...size })
  await context.addInitScript(() => localStorage.setItem("review-triage-agent.name", "Ana"))
  return { context, page: await context.newPage() }
}

/** Waits for the page's data, then a moment for the layout to settle. */
async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage })
}

test("desktop", async ({ browser }, testInfo) => {
  const { context, page } = await open(browser, testInfo.project.use.baseURL, desktop)

  await page.goto("/")
  await page.getByText("Causes by week").waitFor()
  await shot(page, "desktop-1-overview", true)

  await page.getByRole("link", { name: "Crashes in version 4.2.0" }).click()
  await page.getByRole("heading", { name: /Reviews: / }).waitFor()
  await shot(page, "desktop-2-spike-reviews")

  await page.goto("/queue")
  await page.locator("tbody a").first().waitFor()
  await shot(page, "desktop-3-queue")

  await page.locator("tbody a").first().click()
  await page
    .getByLabel("Reply text")
    .fill(`Sorry po, ire-refund namin bukas ang pera ninyo.\n${SUPPORT}`)
  await page.getByRole("button", { name: /^Save/ }).click()
  await page.getByText(/promises a refund/).waitFor()
  await shot(page, "desktop-4-rule-caught")

  // Claude drafts the reply that is approved (needs the API key).
  await page.getByRole("button", { name: "Draft again with Claude" }).click()
  await page.getByText("✓ Keeps every rule").waitFor({ timeout: 60_000 })
  await page.getByRole("button", { name: "Approve this text" }).click()
  await page.getByRole("button", { name: "Post" }).waitFor()
  await shot(page, "desktop-5-approved")

  await page.goto("/settings")
  await page.getByText("Anthropic API key").waitFor()
  await shot(page, "desktop-6-settings")
  await context.close()
})

test("phone", async ({ browser }, testInfo) => {
  const { context, page } = await open(browser, testInfo.project.use.baseURL, phone)
  await page.goto("/")
  await page.getByText("Causes by week").waitFor()
  await shot(page, "phone-1-overview")
  await page.goto("/queue")
  await page.locator("main li a").first().waitFor()
  await shot(page, "phone-2-queue")
  await context.close()
})
