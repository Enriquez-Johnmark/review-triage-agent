import { describe, expect, it } from "vitest"

import { FixedClock } from "../src/clock.ts"
import { sortPending } from "../src/commands/sort.ts"
import { FINANCE_CAUSES } from "../src/core/causes.ts"
import { sampleReviews } from "../src/samples.ts"
import { auditLog } from "../src/store/audit.ts"
import { openDb } from "../src/store/db.ts"
import { labelFor, setCauseByHand } from "../src/store/labels.ts"
import { saveReviews } from "../src/store/reviews.ts"
import { confident, FakeSorter } from "./fixtures/sorters.ts"

const APP = "com.example.wallet"
const settings = { appId: APP, causes: FINANCE_CAUSES, threshold: 0.6 }
const ids = FINANCE_CAUSES.map((cause) => cause.id)

function world() {
  const db = openDb(":memory:")
  const clock = new FixedClock(new Date("2026-11-02T01:00:00Z"))
  saveReviews(db, clock, sampleReviews())
  return { db, clock }
}

describe("sorting", () => {
  it("b1_sorts_every_review_once", async () => {
    const { db, clock } = world()
    const sorter = new FakeSorter(() => confident("other"))

    const first = await sortPending(db, clock, sorter, settings)
    const again = await sortPending(db, clock, sorter, settings)

    expect(first).toEqual({ sorted: 24, needsPerson: 0, failed: 0 })
    expect(again).toEqual({ sorted: 0, needsPerson: 0, failed: 0 })
  })

  it("b2_a_failed_model_call_leaves_the_review_for_the_next_run", async () => {
    const { db, clock } = world()
    let calls = 0
    const flaky = new FakeSorter(() => {
      calls += 1
      if (calls === 1) throw new Error("rate limited")
      return confident("other")
    })

    const first = await sortPending(db, clock, flaky, settings, 1)
    const second = await sortPending(db, clock, flaky, settings, 1)

    expect(first).toEqual({ sorted: 23, needsPerson: 0, failed: 1 })
    expect(second).toEqual({ sorted: 1, needsPerson: 0, failed: 0 })
  })

  it("d4_the_model_is_shown_only_the_text_stars_and_app_version", async () => {
    const { db, clock } = world()
    const sorter = new FakeSorter(() => confident("other"))

    await sortPending(db, clock, sorter, settings)

    for (const input of sorter.seen)
      expect(Object.keys(input).sort()).toEqual(["appVersion", "stars", "text"])
  })
})

describe("B5", () => {
  it("b5_a_cause_set_by_hand_is_kept_on_later_sorting_runs_and_logged", async () => {
    const { db, clock } = world()
    const key = { store: "google_play" as const, storeReviewId: "sample-001" }
    await sortPending(db, clock, new FakeSorter(() => confident("other")), settings)

    setCauseByHand(db, clock, key, "crash", ids, "ana@example.test")
    await sortPending(db, clock, new FakeSorter(() => confident("fees")), { ...settings })

    expect(labelFor(db, key)).toMatchObject({ cause: "crash", setBy: "person" })
    expect(auditLog(db)).toEqual([
      {
        at: "2026-11-02T01:00:00.000Z",
        actor: "ana@example.test",
        action: "cause.set_by_hand",
        subject: "review:google_play:sample-001",
        details: { from: "other", to: "crash" },
      },
    ])
  })

  it("b5_a_cause_outside_the_apps_list_is_refused", () => {
    const { db, clock } = world()

    expect(() => {
      setCauseByHand(db, clock, { store: "google_play", storeReviewId: "sample-001" }, "loans", ids, "ana")
    }).toThrow(/isn't one of this app's causes/)
  })

  it("b5_the_audit_log_cannot_be_changed", () => {
    const { db, clock } = world()
    setCauseByHand(db, clock, { store: "google_play", storeReviewId: "sample-001" }, "crash", ids, "ana")

    expect(() => db.prepare("update audit_log set actor = 'someone else'").run()).toThrow(/append-only/)
    expect(() => db.prepare("delete from audit_log").run()).toThrow(/append-only/)
  })
})
