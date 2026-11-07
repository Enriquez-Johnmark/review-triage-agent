import { describe, expect, it } from "vitest"

import type { OverviewAnswer, ReviewAnswer } from "../src/api/types.ts"
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
