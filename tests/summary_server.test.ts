import { describe, expect, it } from "vitest"

import { buildSummaryServer } from "../src/api/summaryServer.ts"
import { saveSettings } from "../src/store/settings.ts"
import { SUPPORT, world } from "./fixtures/replies.ts"

const TOKEN = "made-up-token-for-tests-0123456789"

function summaryServer() {
  const { db, clock } = world()
  saveSettings(db, clock, { googlePlayId: "com.example.wallet", supportChannel: SUPPORT }, "ana")
  const none = () => Promise.resolve({ reviews: [], skipped: 0 })
  return buildSummaryServer({
    db,
    clock,
    sorter: undefined,
    fetchers: { googlePlay: none, appStore: none },
    token: TOKEN,
  })
}

describe("the summary listener for n8n", () => {
  it("gives the daily summary and fetches, with the token", async () => {
    const app = summaryServer()
    const auth = { authorization: `Bearer ${TOKEN}` }

    const summary = await app.inject({ url: "/summary", headers: auth })
    expect(summary.json()).toMatchObject({
      newReviews: 1,
      text: expect.stringContaining("New reviews") as string,
    })
    const fetched = await app.inject({ method: "POST", url: "/fetch", headers: auth })
    expect(fetched.json()).toMatchObject({ sortingSkipped: true })
  })

  it("answers nothing without the right token, and offers nothing else", async () => {
    const app = summaryServer()
    expect((await app.inject("/summary")).statusCode).toBe(401)
    expect(
      (await app.inject({ url: "/summary", headers: { authorization: "Bearer wrong" } })).statusCode,
    ).toBe(401)
    const other = await app.inject({ url: "/api/queue", headers: { authorization: `Bearer ${TOKEN}` } })
    expect(other.statusCode).toBe(404)
    const approve = await app.inject({
      method: "POST",
      url: "/api/drafts/1/approve",
      headers: { authorization: `Bearer ${TOKEN}` },
    })
    expect(approve.statusCode).toBe(404)
  })

  it("refuses a short token", () => {
    const { db, clock } = world()
    const none = () => Promise.resolve({ reviews: [], skipped: 0 })
    expect(() =>
      buildSummaryServer({
        db,
        clock,
        sorter: undefined,
        fetchers: { googlePlay: none, appStore: none },
        token: "short",
      }),
    ).toThrow("at least 24")
  })
})
