import { describe, expect, it } from "vitest"

import { parseFeedPage } from "../src/fetch/appStore.ts"
import { fetchGooglePlay } from "../src/fetch/googlePlay.ts"
import { APPLE_APP, applePage, PLAY_APP, playReviews } from "./fixtures/store-data.ts"

describe("a malformed review", () => {
  it("a2_is_skipped_and_counted_without_losing_the_rest_of_google_play", async () => {
    const broken = [
      { ...playReviews[0], id: "no-date", date: "not a date" },
      { ...playReviews[0], id: "bad-score", score: 9 },
      ...playReviews,
    ] as typeof playReviews

    const fetched = await fetchGooglePlay(PLAY_APP, 10, () =>
      Promise.resolve({ data: broken, nextPaginationToken: null }),
    )

    expect(fetched.reviews.map((r) => r.storeReviewId)).toEqual(["gp-1", "gp-2", "gp-3"])
    expect(fetched.skipped).toBe(2)
  })

  it("a2_is_skipped_and_counted_without_losing_the_rest_of_the_app_store", () => {
    const [app, good] = applePage.feed.entry
    const page = {
      feed: { entry: [app, { ...good, id: { label: "as-bad" }, "im:rating": { label: "" } }, good] },
    }

    const fetched = parseFeedPage(page, APPLE_APP)

    expect(fetched.reviews.map((r) => r.storeReviewId)).toEqual(["as-1"])
    expect(fetched.skipped).toBe(1)
  })
})
