import { test } from "@playwright/test"

import { addOverlay, OUT, pointAt, press, record, say } from "./support.ts"

const size = { width: 1280, height: 720 }
const SUPPORT = "Message us in the app: Help > Chat."

/** About two minutes with the agent, with captions; saved as
 *  docs/showcase/walkthrough.mp4. It posts a reply (to the stand-in), so it
 *  runs after the screenshots, on the same fresh demo. */
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
  await say(page, "Claude sorts each review by cause, language and whether money is involved.")
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

  await press(page, page.locator("tbody a").first())
  await page.getByText("Money involved").waitFor()
  await say(page, "With an API key, Claude drafts the reply. Here, Ana writes one herself.")
  const reply = page.getByLabel("Reply text")
  await press(page, reply)
  await reply.fill(`Sorry po, ire-refund namin bukas ang pera ninyo.\n${SUPPORT}`)
  await press(page, page.getByRole("button", { name: /^Save/ }))
  await page.getByText(/promises a refund/).waitFor()
  await say(
    page,
    "Code checks every reply, the model's or a person's: no promised refunds or dates."
  )
  await say(page, "No asking for PINs or OTPs, no blame, the right language, 350 characters.")

  await reply.fill(
    `Pasensya na po sa abala. Tinitingnan na po ng aming team ang inyong transaksyon.\n${SUPPORT}`
  )
  await press(page, page.getByRole("button", { name: /^Save/ }))
  await page.getByText("✓ Keeps every rule").waitFor()
  await say(page, "This one keeps every rule.", 3500)
  await press(page, page.getByRole("button", { name: "Approve this text" }))
  await page.getByRole("button", { name: "Post" }).waitFor()
  await say(page, "The approval binds this exact text: editing it cancels the approval.")
  await press(page, page.getByRole("button", { name: "Post" }))
  await page.getByText("Posted", { exact: true }).waitFor()
  await say(page, "Posted once, here to a stand-in. Every step is in an append-only log.")

  await press(page, page.getByRole("link", { name: "Settings" }))
  await page.getByText("Anthropic API key").waitFor()
  await say(page, "Settings: the app to watch, the support channel, the confidence threshold.")
  await pointAt(page, page.getByText("Not set"))
  await say(page, "The API key stays on this computer and is never shown.", 4500)
  await say(page, "Claude can also use it through MCP, and n8n emails a summary each morning.")
  await page.goto("/")
  await page.getByText("Causes by week").waitFor()
  await say(page, "Public reviews only, and not affiliated with any app's maker.", 4500)

  await stop(`${OUT}/walkthrough.mp4`)
  await context.close()
})
