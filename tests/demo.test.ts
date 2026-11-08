import { describe, expect, it } from "vitest"

import { FixedClock } from "../src/clock.ts"
import { summarise } from "../src/commands/summary.ts"
import { FINANCE_CAUSES } from "../src/core/causes.ts"
import { loadDemo } from "../src/demo.ts"
import { SORT_MODEL } from "../src/model/claude.ts"
import { loadRecordings } from "../src/model/recorded.ts"
import { openDb } from "../src/store/db.ts"
import { labelFor } from "../src/store/labels.ts"
import { appIds, loadSettings } from "../src/store/settings.ts"

describe("the demo", () => {
  it("loads the made-up reviews once, sorted, with this week's crash spike", () => {
    const db = openDb(":memory:")
    const clock = new FixedClock(new Date("2026-11-04T02:00:00Z"))

    expect(loadDemo(db, clock)).toBe(120)
    expect(loadDemo(db, clock)).toBe(0)

    const summary = summarise(db, clock, appIds(loadSettings(db)), FINANCE_CAUSES)
    expect(summary.overview.topCauses[0]).toEqual({ cause: "crash", count: 6 })
    expect(summary.weeklySpikes.map((spike) => spike.cause)).toContain("crash")
    expect(summary.versionSpikes.map((spike) => spike.version)).toEqual(["4.2.0"])
  })

  it("shows Claude's recorded sorting, mistakes included, where an answer is recorded", () => {
    const db = openDb(":memory:")
    const recordings = loadRecordings("samples/recorded-labels.json")
    if (!recordings) throw new Error("run `pnpm cli eval --record` first")
    loadDemo(db, new FixedClock(new Date("2026-11-04T02:00:00Z")), "samples/labelled.json", recordings)

    // The right cause is cash_out; Claude, as recorded, said other.
    const missed = labelFor(db, { store: "google_play", storeReviewId: "labelled-067" })
    expect(missed).toMatchObject({ cause: "other", setBy: "model" })
    const row = db.prepare("select model from labels where store_review_id = 'labelled-067'").get() as {
      model: string
    }
    expect(row.model).toBe(SORT_MODEL)
  })
})
