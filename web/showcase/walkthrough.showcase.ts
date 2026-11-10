import { execFileSync, spawn } from "node:child_process"
import { resolve } from "node:path"

import { type Page, test } from "@playwright/test"

import { addOverlay, OUT, pointAt, press, record, say } from "./support.ts"

const size = { width: 1280, height: 720 }
const ROOT = resolve(import.meta.dirname, "../..")
/** The demo database the showcase server uses (playwright.config.ts). */
const DB = "data/showcase.db"

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

/** About two and a quarter minutes with the agent, with captions; saved as
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
  await pointAt(page, page.getByLabel("Google Play ID"))
  await say(
    page,
    "For a real app, its store IDs go here, and pnpm cli fetch reads its new public reviews from Google Play and the App Store."
  )
  await say(
    page,
    "Reviewer names are dropped as reviews are read; the demo uses made-up ones.",
    4500
  )
  await pointAt(page, page.getByText("Set", { exact: true }))
  await say(page, "The API key stays on this computer and is never shown.", 4500)

  // Claude through MCP: a real session with `pnpm cli mcp` on this demo.
  // (The morning summary is run now too, so no scene waits on it.)
  const summary = execFileSync("pnpm", ["-s", "cli", "summary", "--db", DB], {
    cwd: ROOT,
    encoding: "utf8",
  })
  const mcp = await mcpSession(["list_spikes"])
  await showTerminal(page, "Claude's tools, over MCP (pnpm cli mcp)", mcp)
  await say(page, "Claude can use the agent through MCP: search, summarise, list spikes and draft.")
  await say(page, "No tool can approve or post a reply: that stays with a person.", 4500)
  await hideTerminal(page)

  // The morning summary n8n emails: the same command, run now.
  await showTerminal(page, "$ pnpm cli summary", summary)
  await say(page, "Each morning an n8n workflow fetches, sorts and emails this summary.")
  await hideTerminal(page)
  await page.goto("/")
  await page.getByText("Causes by week").waitFor()
  await say(page, "Public reviews only, and not affiliated with any app's maker.", 4500)

  await stop(`${OUT}/walkthrough.mp4`)
  await context.close()
})

/** A real MCP session with the agent (`pnpm cli mcp`) on the demo: it lists
 *  the tools, then calls each of `calls`, and returns the exchange as text. */
async function mcpSession(calls: string[]) {
  const child = spawn("pnpm", ["-s", "cli", "mcp", "--db", DB], {
    cwd: ROOT,
    stdio: ["pipe", "pipe", "inherit"],
  })
  const answers = new Map<number, unknown>()
  let buffered = ""
  child.stdout.setEncoding("utf8")
  child.stdout.on("data", (chunk: string) => {
    buffered += chunk
    let end = buffered.indexOf("\n")
    while (end >= 0) {
      const message = JSON.parse(buffered.slice(0, end)) as { id?: number; result?: unknown }
      if (message.id !== undefined) answers.set(message.id, message.result)
      buffered = buffered.slice(end + 1)
      end = buffered.indexOf("\n")
    }
  })
  let next = 0
  const ask = async (method: string, params: object) => {
    const id = ++next
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n")
    for (let waited = 0; waited < 300 && !answers.has(id); waited++)
      await new Promise((done) => setTimeout(done, 100))
    if (!answers.has(id)) throw new Error(`the MCP server didn't answer ${method}`)
    return answers.get(id)
  }
  await ask("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "showcase", version: "1" },
  })
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n")
  const { tools } = (await ask("tools/list", {})) as { tools: { name: string; title?: string }[] }
  const lines = [
    "→ tools/list",
    ...tools.map((tool) => `   ${tool.name.padEnd(18)} ${tool.title ?? ""}`),
  ]
  for (const name of calls) {
    const result = (await ask("tools/call", { name, arguments: {} })) as {
      content: { type: string; text: string }[]
    }
    const text = result.content.map((part) => part.text).join("\n")
    lines.push("", `→ tools/call ${name}`, JSON.stringify(JSON.parse(text), null, 2))
  }
  child.kill()
  return lines.join("\n")
}

/** Shows a terminal's text over the page. */
async function showTerminal(page: Page, title: string, text: string) {
  await page.evaluate(
    ({ title, text }) => {
      const sheet = document.createElement("div")
      sheet.id = "showcase-terminal"
      sheet.style.cssText =
        "position:fixed;top:24px;left:24px;right:24px;max-height:calc(100% - 144px);z-index:2147483646;" +
        "background:#0f172a;color:#e2e8f0;" +
        "border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden"
      const bar = document.createElement("div")
      bar.textContent = title
      bar.style.cssText =
        "padding:10px 16px;font:600 13px ui-monospace,monospace;background:#1e293b;color:#cbd5e1"
      const body = document.createElement("pre")
      body.textContent = text
      body.style.cssText =
        "margin:0;padding:14px 16px;font:13px/1.55 ui-monospace,monospace;overflow:hidden;white-space:pre"
      sheet.append(bar, body)
      document.body.append(sheet)
    },
    { title, text }
  )
}

async function hideTerminal(page: Page) {
  await page.evaluate(() => document.getElementById("showcase-terminal")?.remove())
}
