import { describe, expect, it } from "vitest"

import { dailySummary, formatDaily } from "../src/commands/daily.ts"
import { postReply } from "../src/commands/post.ts"
import { approveReply, writeReply } from "../src/commands/replies.ts"
import { FINANCE_CAUSES } from "../src/core/causes.ts"
import { withSupport } from "../src/core/reply-rules.ts"
import { FixedClock } from "../src/clock.ts"
import { loadDemo } from "../src/demo.ts"
import { StubPoster } from "../src/post/stub.ts"
import { openDb } from "../src/store/db.ts"
import { appIds, loadSettings } from "../src/store/settings.ts"
import { labelFor } from "../src/store/labels.ts"
import { GOOD } from "./fixtures/replies.ts"

const TAGALOG = "Pasensya na po sa abala. Tinitingnan na po ng aming team ang inyong transaksyon."

function demo() {
  const db = openDb(":memory:")
  const clock = new FixedClock(new Date("2026-11-04T02:00:00Z"))
  loadDemo(db, clock)
  return { db, clock, ids: appIds(loadSettings(db)) }
}

describe("F4", () => {
  it("f4_the_daily_summary_has_its_five_parts", () => {
    const { db, clock, ids } = demo()

    const summary = dailySummary(db, clock, ids, FINANCE_CAUSES)

    expect(summary.newReviews).toBe(120)
    expect(summary.shareAnswered).toBe(0)
    expect(summary.topCauses).toEqual([{ cause: "crash", label: "Crash or won't open", count: 6 }])
    expect(summary.spikes.weekly.map((spike) => spike.cause)).toEqual(["crash"])
    expect(summary.spikes.versions.map((spike) => spike.version)).toEqual(["4.2.0"])
    expect(summary.moneyWaiting.count).toBeGreaterThan(0)
    expect(summary.moneyWaiting.newest.length).toBeLessThanOrEqual(5)

    const text = formatDaily(summary, FINANCE_CAUSES)
    for (const part of [
      "New reviews since yesterday: 120",
      "Answered this week: 0%",
      "Top causes this week: Crash or won't open (6)",
      "Spikes: Crash or won't open, 6 this week",
      `Money complaints still waiting for a reply: ${String(summary.moneyWaiting.count)}`,
    ])
      expect(text).toContain(part)
  })

  it("f4_new_reviews_count_only_the_last_day_and_posted_money_replies_stop_waiting", async () => {
    const { db, clock, ids } = demo()
    const before = dailySummary(db, clock, ids, FINANCE_CAUSES).moneyWaiting
    const first = before.newest[0]
    if (!first) throw new Error("the demo has money complaints")
    const settings = { causes: FINANCE_CAUSES, supportChannel: loadSettings(db).supportChannel }
    const key = { store: "google_play" as const, storeReviewId: first.storeReviewId }
    const reply = labelFor(db, key)?.language === "english" ? GOOD : TAGALOG
    const draft = writeReply(db, clock, key, withSupport(reply, settings.supportChannel), "ana", settings)
    approveReply(db, clock, draft.id, "ben", settings)
    await postReply(db, clock, new StubPoster(db, clock), draft.id, "ben")
    clock.advanceDays(2)

    const after = dailySummary(db, clock, ids, FINANCE_CAUSES)
    expect(after.newReviews).toBe(0)
    expect(after.moneyWaiting.count).toBe(before.count - 1)
  })
})
