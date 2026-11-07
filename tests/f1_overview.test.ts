import { describe, expect, it } from "vitest"

import { FixedClock } from "../src/clock.ts"
import { sortPending } from "../src/commands/sort.ts"
import { formatSummary, summarise } from "../src/commands/summary.ts"
import { FINANCE_CAUSES } from "../src/core/causes.ts"
import type { Review } from "../src/core/review.ts"
import { openDb } from "../src/store/db.ts"
import { setCauseByHand } from "../src/store/labels.ts"
import { saveReviews } from "../src/store/reviews.ts"
import { confident, FakeSorter } from "./fixtures/sorters.ts"

const APP = "com.example.wallet"
const ids = FINANCE_CAUSES.map((cause) => cause.id)
let next = 0
/** A review whose text is the cause the fake model will give it. */
const review = (at: string, cause: string, companyReplied: boolean | null, appId = APP): Review => ({
  store: "google_play",
  storeReviewId: `r${String((next += 1))}`,
  appId,
  at,
  stars: cause === "praise" ? 5 : 1,
  text: cause,
  appVersion: "4.2.0",
  companyReplied,
})

async function world(reviews: Review[]) {
  const db = openDb(":memory:")
  // Wednesday 2026-11-04, 10:00 Manila: this week began Monday 2026-11-02.
  const clock = new FixedClock(new Date("2026-11-04T02:00:00Z"))
  saveReviews(db, clock, reviews)
  await sortPending(db, clock, new FakeSorter((input) => confident(input.text)), {
    appId: APP,
    causes: FINANCE_CAUSES,
    threshold: 0.6,
  })
  return { db, clock }
}

describe("F1", () => {
  it("f1_the_overview_counts_this_weeks_reviews_share_answered_and_top_causes", async () => {
    const { db, clock } = await world([
      review("2026-11-02T01:00:00.000Z", "crash", false),
      review("2026-11-02T02:00:00.000Z", "crash", true),
      review("2026-11-03T03:00:00.000Z", "crash", false),
      review("2026-11-03T04:00:00.000Z", "login", true),
      review("2026-11-03T05:00:00.000Z", "login", null), // App Store: unknown, not counted either way
      review("2026-11-04T01:00:00.000Z", "fees", false),
      review("2026-11-04T01:30:00.000Z", "praise", false),
      review("2026-10-30T00:00:00.000Z", "fees", true), // last week
      review("2026-11-03T00:00:00.000Z", "crash", false, "com.other.app"), // another app
    ])

    const { overview } = summarise(db, clock, APP, FINANCE_CAUSES)

    expect(overview).toEqual({
      week: "2026-11-02",
      reviews: 7,
      answered: 2,
      replyKnown: 6,
      shareAnswered: 2 / 6,
      topCauses: [
        { cause: "crash", count: 3 },
        { cause: "login", count: 2 },
        { cause: "fees", count: 1 },
      ],
      needsPerson: 0,
    })
  })

  it("f1_a_cause_set_by_hand_counts_and_unsorted_reviews_count_as_needing_a_person", async () => {
    const { db, clock } = await world([review("2026-11-03T00:00:00.000Z", "crash", false)])
    setCauseByHand(
      db,
      clock,
      { store: "google_play", storeReviewId: `r${String(next)}` },
      "login",
      ids,
      "ana",
    )
    saveReviews(db, clock, [review("2026-11-03T01:00:00.000Z", "crash", false)]) // not sorted yet

    const { overview } = summarise(db, clock, APP, FINANCE_CAUSES)

    expect(overview.topCauses).toEqual([{ cause: "login", count: 1 }])
    expect(overview.reviews).toBe(2)
    expect(overview.needsPerson).toBe(1)
  })

  it("f1_a_week_with_no_known_replies_has_no_share", async () => {
    const { db, clock } = await world([review("2026-11-03T00:00:00.000Z", "crash", null)])
    expect(summarise(db, clock, APP, FINANCE_CAUSES).overview.shareAnswered).toBeNull()
  })

  it("f1_the_summary_carries_the_spikes_from_the_stored_labels", async () => {
    const weeks = ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]
    const { db, clock } = await world([
      ...weeks.map((week) => review(`${week}T04:00:00.000Z`, "crash", false)),
      ...Array.from({ length: 5 }, () => review("2026-11-03T04:00:00.000Z", "crash", false)),
    ])
    const { weeklySpikes } = summarise(db, clock, APP, FINANCE_CAUSES)
    expect(weeklySpikes).toEqual([{ cause: "crash", week: "2026-11-02", count: 5, previousAverage: 1 }])
  })
})

describe("the summary command", () => {
  it("prints the numbers with the causes' names", async () => {
    const { db, clock } = await world([
      review("2026-11-03T00:00:00.000Z", "crash", true),
      review("2026-11-03T01:00:00.000Z", "crash", false),
    ])
    const text = formatSummary(summarise(db, clock, APP, FINANCE_CAUSES), FINANCE_CAUSES)
    expect(text).toContain("Week of 2026-11-02: 2 reviews, 0 waiting for a person")
    expect(text).toContain("Answered: 50% (1 of 2)")
    expect(text).toContain("Top causes: Crash or won't open 2")
  })
})
