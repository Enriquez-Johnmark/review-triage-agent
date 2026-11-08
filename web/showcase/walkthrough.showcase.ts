import { type Page, test } from "@playwright/test"

import { addOverlay, OUT, pointAt, press, record, say } from "./support.ts"

const size = { width: 1280, height: 720 }

/** Waits for Claude's draft; the video needs one that keeps every rule (the
 *  server already redrafts once), so anything else stops the recording. */
async function claudeDraftKeepsEveryRule(page: Page) {
  await page
    .getByText(/Keeps every rule|For a person to write|Rules broken/)
    .first()
    .waitFor({ timeout: 60_000 })
  if (!(await page.getByText("✓ Keeps every rule").isVisible()))
    throw new Error("Claude's draft broke a rule; record again")
}

/** About two minutes with the agent, with captions; saved as
 *  docs/showcase/walkthrough.mp4. Claude drafts the replies live, so it needs
 *  the API key. It posts a reply (to the stand-in), so it runs after the
 *  screenshots, on the same fresh demo. */
test("walkthrough", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: size,
  })
  const page = await context.newPage()
  await addOverlay(page)
  const stop = await record(page, testInfo.outputPath("frames"))

  await page.goto("/")
  await page.getByText("Causes by week").waitFor()
  await say(page, "The Review Triage Agent reads an app's public reviews, here made-up ones.")
  await pointAt(page, page.getByText("Top causes this week"))
  await say(
    page,
    "Claude sorts each review by cause, language and money: 98% right on a labelled test."
  )
  await pointAt(page, page.getByRole("link", { name: /Crash or won't open, week of/ }))
  await say(page, "It spots spikes: crashes doubled this week, and in version 4.2.0.")
  await page.mouse.wheel(0, 600)
  await say(page, "Causes by week, and crash share by app version.", 4500)

  await press(page, page.getByRole("link", { name: "Crashes in version 4.2.0" }))
  await page.getByRole("heading", { name: /Reviews: / }).waitFor()
  await say(page, "Every number links to the reviews behind it.", 4500)

  await press(page, page.getByRole("link", { name: "Queue" }))
  await page.locator("tbody a").first().waitFor()
  await say(page, "The queue: money complaints first, then the newest low ratings.")
  await press(page, page.getByPlaceholder("your name"))
  await page.getByPlaceholder("your name").pressSequentially("Ana", { delay: 120 })
  await say(page, "A person signs every approval with their name.", 3500)

  // The screenshots, run first on the same demo, approved the first one's reply.
  await press(
    page,
    page.locator("tbody tr").filter({ hasNotText: "Approved" }).first().locator("a")
  )
  await page.getByText("Money involved").waitFor()
  await say(page, "One click, and Claude drafts the reply in the reviewer's language.", 4000)
  await press(page, page.getByRole("button", { name: "Draft with Claude" }))
  await claudeDraftKeepsEveryRule(page)
  await pointAt(page, page.getByLabel("Reply text"))
  await say(page, "This is Claude's draft, live: code checked it before anyone sees it.")

  const reply = page.getByLabel("Reply text")
  await press(page, reply)
  await reply.fill("")
  await reply.pressSequentially(
    "Sorry about the fee! We'll refund it tomorrow.\nMessage us in the app: Help > Chat.",
    { delay: 35 }
  )
  await press(page, page.getByRole("button", { name: /^Save/ }))
  await page.getByText(/promises a refund/).waitFor()
  await say(
    page,
    "Ana writes her own, with a promise. Code checks every reply, the model's or a person's."
  )
  await say(page, "No promised refunds or dates, no asking for PINs or OTPs, no blame.")

  await press(page, page.getByRole("button", { name: "Draft again with Claude" }))
  await claudeDraftKeepsEveryRule(page)
  await say(page, "Claude drafts again; this one keeps every rule.", 3500)
  await press(page, page.getByRole("button", { name: "Approve this text" }))
  await page.getByRole("button", { name: "Post" }).waitFor()
  await say(page, "Ana approves this exact text: editing it cancels the approval.")
  await press(page, page.getByRole("button", { name: "Post" }))
  await page.getByText("Posted", { exact: true }).waitFor()
  await say(page, "Posted once, here to a stand-in. Every step is in an append-only log.")

  await press(page, page.getByRole("link", { name: "Settings" }))
  await page.getByText("Anthropic API key").waitFor()
  await say(page, "Settings: the app to watch, the support channel, the confidence threshold.")
  await pointAt(page, page.getByText("Set", { exact: true }))
  await say(page, "The API key stays on this computer and is never shown.", 4500)
  await say(page, "Claude can also use it through MCP, and n8n emails a summary each morning.")
  await page.goto("/")
  await page.getByText("Causes by week").waitFor()
  await say(page, "Public reviews only, and not affiliated with any app's maker.", 4500)

  await stop(`${OUT}/walkthrough.mp4`)
  await context.close()
})
