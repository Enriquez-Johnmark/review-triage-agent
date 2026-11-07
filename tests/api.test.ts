import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { OverviewAnswer, ReviewAnswer, ReviewEntry } from "../src/api/types.ts"
import { saveModelOutcome } from "../src/store/labels.ts"
import { saveReviews } from "../src/store/reviews.ts"
import { stubPosts } from "../src/post/stub.ts"
import { GOOD, FakeDrafter } from "./fixtures/replies.ts"
import { server } from "./fixtures/server.ts"

const REVIEW = "/api/reviews/google_play/gp-crash"

describe("the dashboard's API", () => {
  it("shows the overview, the queue and one review", async () => {
    const { app } = await server()

    const overview = (await app.inject("/api/overview")).json<OverviewAnswer>()
    expect(overview.summary.overview).toMatchObject({ week: "2026-11-02", reviews: 1 })
    expect(overview.causesByWeek).toHaveLength(12)
    expect(overview.crashShareByVersion).toEqual([{ version: "4.2.0", reviews: 1, crashes: 1, share: 1 }])

    const daily = (await app.inject("/api/summary")).json<{ newReviews: number; text: string }>()
    expect(daily.newReviews).toBe(1)
    expect(daily.text).toContain("New reviews since yesterday: 1")

    const queue = (await app.inject("/api/queue")).json<{ draftStatus: string | null }[]>()
    expect(queue).toHaveLength(1)

    const review = (await app.inject(REVIEW)).json<ReviewAnswer>()
    expect(review).toMatchObject({ label: { cause: "crash" }, draft: null })
    expect((await app.inject("/api/reviews/google_play/nope")).statusCode).toBe(404)
  })

  it("lists the reviews behind a number on the overview", async () => {
    const { app } = await server()
    const crash = await app.inject("/api/reviews?cause=crash&week=2026-11-02")
    const login = await app.inject("/api/reviews?cause=login")
    expect(crash.json()).toHaveLength(1)
    expect(login.json()).toEqual([])
    expect((await app.inject("/api/reviews?week=last-week")).statusCode).toBe(400)
    expect((await app.inject("/api/reviews?waiting=needs_person")).json()).toEqual([])
    expect((await app.inject("/api/reviews?waiting=unsorted")).json()).toEqual([])
    expect((await app.inject("/api/reviews?week=2026-11-02")).json()).toHaveLength(1)
  })

  it("drafts, approves and posts a reply once, through the same rules", async () => {
    const { app, db } = await server({ drafter: new FakeDrafter([GOOD]) })

    const draft = (await app.inject({ method: "POST", url: `${REVIEW}/draft` })).json<{ id: number }>()
    const unnamed = await app.inject({
      method: "POST",
      url: `/api/drafts/${String(draft.id)}/approve`,
      payload: { by: "" },
    })
    expect(unnamed.statusCode).toBe(400)
    const approve = await app.inject({
      method: "POST",
      url: `/api/drafts/${String(draft.id)}/approve`,
      payload: { by: "ana" },
    })
    expect(approve.json()).toMatchObject({ status: "approved" })
    const post = () =>
      app.inject({ method: "POST", url: `/api/drafts/${String(draft.id)}/post`, payload: { by: "ana" } })
    expect((await post()).json()).toMatchObject({ kind: "posted" })
    expect((await post()).json()).toMatchObject({ kind: "already_posted" })
    expect(stubPosts(db)).toHaveLength(1)
  })

  it("says plainly why an action is refused", async () => {
    const { app } = await server()
    const noKey = await app.inject({ method: "POST", url: `${REVIEW}/draft` })
    expect(noKey.statusCode).toBe(400)
    expect(noKey.json()).toEqual({ error: "set ANTHROPIC_API_KEY in .env to draft replies with Claude" })
    const broken = await app.inject({
      method: "PUT",
      url: `${REVIEW}/reply`,
      payload: { text: "We will refund you tomorrow.", by: "ana" },
    })
    expect(broken.json()).toMatchObject({ status: "flagged" })
  })

  it("answers only requests addressed to this computer, so a rebound domain gets nothing", async () => {
    const { app } = await server()
    const rebound = await app.inject({ url: "/api/queue", headers: { host: "evil.example.test:4317" } })
    expect(rebound.statusCode).toBe(403)
    expect(rebound.body).not.toContain("gp-crash")
    expect((await app.inject({ url: "/api/queue", headers: { host: "127.0.0.1:4317" } })).statusCode).toBe(
      200,
    )
    expect((await app.inject({ url: "/api/queue", headers: { host: "localhost:5173" } })).statusCode).toBe(
      200,
    )
  })

  it("refuses changes sent from another site", async () => {
    const { app } = await server()
    const response = await app.inject({
      method: "POST",
      url: `${REVIEW}/cause`,
      headers: { origin: "https://evil.example.test", host: "127.0.0.1:4317" },
      payload: { cause: "login", by: "ana" },
    })
    expect(response.statusCode).toBe(403)
  })

  it("changes a cause by hand and the settings", async () => {
    const { app } = await server()
    const cause = await app.inject({
      method: "POST",
      url: `${REVIEW}/cause`,
      payload: { cause: "login", by: "ana" },
    })
    expect(cause.json()).toMatchObject({ label: { cause: "login", setBy: "person" } })
    const settings = await app.inject({
      method: "PUT",
      url: "/api/settings",
      payload: { threshold: 0.7, by: "ana" },
    })
    expect(settings.json()).toMatchObject({ threshold: 0.7 })
    expect(
      (await app.inject({ method: "PUT", url: "/api/settings", payload: { threshold: 2, by: "ana" } }))
        .statusCode,
    ).toBe(400)
  })
})

describe("serving the dashboard", () => {
  it("serves its page at every address of its own, and a 404 for missing files and API addresses", async () => {
    const dir = mkdtempSync(join(tmpdir(), "web-"))
    writeFileSync(join(dir, "index.html"), "<html>dashboard</html>")
    const { app } = await server({ webDir: dir })

    expect((await app.inject("/queue")).body).toBe("<html>dashboard</html>")
    expect((await app.inject("/reviews/google_play/gp-1")).body).toBe("<html>dashboard</html>")
    writeFileSync(join(dir, "late.js"), "built after the server started")
    expect((await app.inject("/late.js")).body).toBe("built after the server started")
    expect((await app.inject("/assets/gone.js")).statusCode).toBe(404)
    expect((await app.inject("/api/nothing")).statusCode).toBe(404)
  })
})

describe("the reviews waiting on the overview", () => {
  it("lists those left for a person and those not sorted yet", async () => {
    const { app, db, clock, review } = await server()
    saveReviews(db, clock, [{ ...review, storeReviewId: "gp-new" }])
    saveReviews(db, clock, [{ ...review, storeReviewId: "gp-unsure" }])
    saveModelOutcome(
      db,
      clock,
      { store: "google_play", storeReviewId: "gp-unsure" },
      { kind: "needs_person", reason: "unsure" },
      "fake",
    )

    const ids = async (url: string) =>
      (await app.inject(url)).json<ReviewEntry[]>().map((entry) => entry.review.storeReviewId)
    expect(await ids("/api/reviews?waiting=unsorted")).toEqual(["gp-new"])
    expect(await ids("/api/reviews?waiting=needs_person")).toEqual(["gp-unsure"])
  })
})
