import { describe, expect, it } from "vitest"

import { FixedClock } from "../src/clock.ts"
import { sortPending } from "../src/commands/sort.ts"
import { FINANCE_CAUSES } from "../src/core/causes.ts"
import type { Review } from "../src/core/review.ts"
import { openDb } from "../src/store/db.ts"
import { replyQueue } from "../src/store/queue.ts"
import { saveReviews } from "../src/store/reviews.ts"
import { confident, FakeSorter } from "./fixtures/sorters.ts"

const APP = "com.example.wallet"
const review = (
  id: string,
  stars: number,
  at: string,
  text: string,
  companyReplied: boolean | null = false,
): Review => ({
  store: "google_play",
  storeReviewId: id,
  appId: APP,
  at,
  stars,
  text,
  appVersion: "4.2.0",
  companyReplied,
})

describe("B3", () => {
  it("b3_money_involved_reviews_come_first_then_the_newest_low_ratings", async () => {
    const db = openDb(":memory:")
    const clock = new FixedClock(new Date("2026-11-02T01:00:00Z"))
    saveReviews(db, clock, [
      review("old-crash", 1, "2026-10-01T00:00:00.000Z", "crashes"),
      review("new-crash", 2, "2026-10-20T00:00:00.000Z", "crashes again"),
      review("old-money", 3, "2026-09-15T00:00:00.000Z", "money deducted, no refund"),
      review("praise", 5, "2026-10-25T00:00:00.000Z", "great"),
      review("answered", 1, "2026-10-26T00:00:00.000Z", "crashes", true),
      review("unknown-reply", 1, "2026-10-10T00:00:00.000Z", "crashes", null),
    ])
    await sortPending(
      db,
      clock,
      new FakeSorter((input) =>
        confident(
          input.text.includes("money") ? "failed_transaction" : "crash",
          input.text.includes("money"),
        ),
      ),
      { appId: APP, causes: FINANCE_CAUSES, threshold: 0.6 },
    )

    const queue = replyQueue(db, [APP])

    expect(queue.map((entry) => entry.review.storeReviewId)).toEqual([
      "old-money",
      "new-crash",
      "unknown-reply",
      "old-crash",
    ])
    expect(queue[0]?.label).toMatchObject({ cause: "failed_transaction", moneyInvolved: true })
  })

  it("b3_money_involved_reviews_come_first_across_both_stores", async () => {
    const db = openDb(":memory:")
    const clock = new FixedClock(new Date("2026-11-02T01:00:00Z"))
    saveReviews(db, clock, [
      review("play-crash", 1, "2026-10-20T00:00:00.000Z", "crashes"),
      {
        ...review("apple-money", 1, "2026-10-01T00:00:00.000Z", "money deducted"),
        store: "app_store",
        appId: "123",
      },
    ])
    for (const appId of [APP, "123"])
      await sortPending(
        db,
        clock,
        new FakeSorter((input) =>
          confident(
            input.text.includes("money") ? "failed_transaction" : "crash",
            input.text.includes("money"),
          ),
        ),
        { appId, causes: FINANCE_CAUSES, threshold: 0.6 },
      )

    expect(replyQueue(db, [APP, "123"]).map((entry) => entry.review.storeReviewId)).toEqual([
      "apple-money",
      "play-crash",
    ])
  })

  it("b3_a_review_the_model_couldnt_sort_waits_in_the_queue_whatever_its_stars", async () => {
    const db = openDb(":memory:")
    const clock = new FixedClock(new Date("2026-11-02T01:00:00Z"))
    saveReviews(db, clock, [review("unsure", 3, "2026-10-05T00:00:00.000Z", "money deducted? not sure")])
    await sortPending(
      db,
      clock,
      new FakeSorter(() => JSON.stringify({ ...JSON.parse(confident("other")), confidence: 0.3 })),
      { appId: APP, causes: FINANCE_CAUSES, threshold: 0.6 },
    )

    expect(replyQueue(db, [APP]).map((entry) => entry.review.storeReviewId)).toEqual(["unsure"])
  })
})
