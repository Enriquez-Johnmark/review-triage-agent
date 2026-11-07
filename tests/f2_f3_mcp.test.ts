import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { auditLog } from "../src/store/audit.ts"
import { draftFor } from "../src/store/drafts.ts"
import { mcp } from "./fixtures/mcp.ts"
import { writeReply } from "../src/commands/replies.ts"
import { saveReviews } from "../src/store/reviews.ts"
import { withSupport } from "../src/core/reply-rules.ts"
import { FakeDrafter, GOOD, KEY, settings, SUPPORT } from "./fixtures/replies.ts"

describe("F2", () => {
  it("f2_the_mcp_server_offers_exactly_its_five_tools", async () => {
    const { client } = await mcp()
    const { tools } = await client.listTools()
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "draft_reply",
      "get_review",
      "list_spikes",
      "search_reviews",
      "summarise_issues",
    ])
  })

  it("f2_draft_reply_creates_a_draft_that_still_needs_a_persons_approval", async () => {
    const { call, db } = await mcp(new FakeDrafter([GOOD]))

    const result = await call("draft_reply", { store: KEY.store, id: KEY.storeReviewId })

    expect(result.isError).toBe(false)
    expect(result.json()).toMatchObject({
      status: "ready",
      next: expect.stringContaining("approve") as string,
    })
    expect(draftFor(db, KEY)).toMatchObject({ status: "ready", approvedFingerprint: null })
    expect(auditLog(db).map((entry) => entry.action)).not.toContain("reply.approved")
  })

  it("f2_draft_reply_never_replaces_a_reply_a_person_wrote", async () => {
    const { call, db, clock } = await mcp(new FakeDrafter([GOOD]))
    const mine = withSupport("Sorry about the update. We are looking into it.", SUPPORT)
    writeReply(db, clock, KEY, mine, "ana", settings)

    const result = await call("draft_reply", { store: KEY.store, id: KEY.storeReviewId })

    expect(result).toMatchObject({
      isError: true,
      text: "ana wrote this reply; it is kept rather than replaced by a draft",
    })
    expect(draftFor(db, KEY)?.text).toBe(mine)
  })

  it("f2_no_tool_can_approve_or_post_and_the_server_cant_reach_those_functions", async () => {
    const { call } = await mcp()
    for (const name of ["approve_reply", "post_reply"]) expect((await call(name)).isError).toBe(true)

    const source = readdirSync("src/mcp")
      .map((file) => readFileSync(join("src/mcp", file), "utf8"))
      .join("\n")
    expect(source).not.toMatch(/commands\/(post|replies)\.ts|approveReply|postReply|writeReply|Poster/)
  })

  it("f2_the_other_tools_read_the_reviews_spikes_and_issues", async () => {
    const { call } = await mcp()
    const search = (await call("search_reviews", { cause: "crash", version: "4.2.0" })).json() as {
      total: number
    }
    expect(search.total).toBe(7) // the demo's six and the fixture's own
    const words = (await call("search_reviews", { words: "REFUND", limit: 3 })).json() as {
      reviews: unknown[]
    }
    expect(words.reviews.length).toBeGreaterThan(0)
    const spikes = (await call("list_spikes")).json() as { weekly: { cause: string }[] }
    expect(spikes.weekly.map((spike) => spike.cause)).toContain("crash")
    const issues = (await call("summarise_issues")).json() as { causes: { cause: string; count: number }[] }
    expect(issues.causes[0]).toEqual({ cause: "crash", label: "Crash or won't open", count: 7 })
    const review = (await call("get_review", { store: KEY.store, id: KEY.storeReviewId })).json()
    expect(review).toMatchObject({ id: KEY.storeReviewId, cause: "Crash or won't open", reply: null })
  })
})

describe("F3", () => {
  it.each([
    ["search_reviews", { stars: 6 }, "5"],
    ["search_reviews", { cause: "everything" }, "cause"],
    ["search_reviews", { from: "last week" }, "YYYY-MM-DD"],
    ["search_reviews", { sql: "drop table reviews" }, "sql"],
    ["get_review", { store: "play", id: "x" }, "store"],
    ["get_review", {}, "id"],
    ["draft_reply", { store: "google_play", id: "" }, "id"],
    ["summarise_issues", { from: "2026-11-05", to: "2026-11-01" }, "on or before"],
    ["list_spikes", { extra: true }, "extra"],
  ])("f3_bad_input_is_refused_with_a_clear_message (%s %j)", async (name, args, says) => {
    const { call } = await mcp()
    const result = await call(name, args)
    expect(result.isError).toBe(true)
    expect(result.text.toLowerCase()).toContain(says.toLowerCase())
  })

  it("f3_a_review_that_isnt_there_or_a_missing_key_is_said_plainly", async () => {
    const { call } = await mcp()
    expect((await call("get_review", { store: "google_play", id: "nope" })).text).toBe(
      "no such review: google_play nope",
    )
    expect((await call("draft_reply", { store: "google_play", id: "x" })).text).toContain("API key")
  })
})

describe("dates in the tools", () => {
  it("are Manila days, like the weeks", async () => {
    const { call, db, clock, review } = await mcp()
    // 7:00 on Nov 10 in Manila is still Nov 9 in UTC.
    saveReviews(db, clock, [{ ...review, storeReviewId: "early", at: "2026-11-09T23:00:00.000Z" }])

    const found = (await call("search_reviews", { from: "2026-11-10", to: "2026-11-10" })).json() as {
      reviews: { id: string }[]
    }
    expect(found.reviews.map((entry) => entry.id)).toEqual(["early"])
  })
})
