import { describe, expect, it } from "vitest"

import { FixedClock } from "../src/clock.ts"
import { parseFeedPage } from "../src/fetch/appStore.ts"
import { fromGooglePlay } from "../src/fetch/googlePlay.ts"
import { fetchNew } from "../src/commands/fetch.ts"
import { openDb } from "../src/store/db.ts"
import { listReviews, saveReviews } from "../src/store/reviews.ts"
import { APPLE_APP, applePage, PLAY_APP, playReviews } from "./fixtures/store-data.ts"

describe("A2", () => {
  it("a2_fetching_twice_adds_nothing_new", () => {
    const db = openDb(":memory:")
    const clock = new FixedClock(new Date("2026-11-02T01:00:00Z"))
    const batch = playReviews.map((raw) => fromGooglePlay(raw, PLAY_APP))

    const first = saveReviews(db, clock, batch)
    clock.advanceDays(1)
    const second = saveReviews(db, clock, batch)

    expect(first).toEqual({ added: 3, alreadyThere: 0 })
    expect(second).toEqual({ added: 0, alreadyThere: 3 })
    expect(listReviews(db, PLAY_APP)).toHaveLength(3)
  })

  it("a2_the_app_entry_in_apples_feed_is_not_a_review", () => {
    const reviews = parseFeedPage(applePage, APPLE_APP)

    expect(reviews.map((review) => review.storeReviewId)).toEqual(["as-1"])
    expect(reviews[0]).toMatchObject({ stars: 1, appVersion: "4.1.9", at: "2026-10-30T03:34:03.000Z" })
  })
})

describe("fetchNew", () => {
  it("a2_fetching_both_stores_twice_adds_nothing_new", async () => {
    const db = openDb(":memory:")
    const clock = new FixedClock(new Date("2026-11-02T01:00:00Z"))
    const fetchers = {
      googlePlay: (id: string) => Promise.resolve(playReviews.map((raw) => fromGooglePlay(raw, id))),
      appStore: (id: string) => Promise.resolve(parseFeedPage(applePage, id)),
    }
    const app = { googlePlay: PLAY_APP, appStore: APPLE_APP }

    const first = await fetchNew(db, clock, app, fetchers)
    const second = await fetchNew(db, clock, app, fetchers)

    expect(first).toEqual({ added: 4, alreadyThere: 0 })
    expect(second).toEqual({ added: 0, alreadyThere: 4 })
  })
})
