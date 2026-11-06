import { describe, expect, it } from "vitest"

import { fetchGooglePlay, type GooglePlayPage } from "../src/fetch/googlePlay.ts"
import { PLAY_APP, playReviews } from "./fixtures/store-data.ts"

/** A stand-in for Google Play that serves `pages`, one per request. */
function store(pages: GooglePlayPage[]) {
  const asked: (string | undefined)[] = []
  const request = (token: string | undefined) => {
    asked.push(token)
    const page = pages[asked.length - 1]
    if (!page) throw new Error("asked for a page that isn't there")
    return Promise.resolve(page)
  }
  return { request, asked }
}

const review = (id: string) => ({ ...playReviews[0], id }) as GooglePlayPage["data"][number]

describe("fetching Google Play", () => {
  it("a2_follows_the_next_page_until_it_has_enough", async () => {
    const { request, asked } = store([
      { data: [review("p1"), review("p2")], nextPaginationToken: "t2" },
      { data: [review("p3"), review("p4")], nextPaginationToken: "t3" },
      { data: [review("p5")], nextPaginationToken: "t4" },
    ])

    const found = await fetchGooglePlay(PLAY_APP, 4, request)

    expect(found.map((r) => r.storeReviewId)).toEqual(["p1", "p2", "p3", "p4"])
    expect(asked).toEqual([undefined, "t2"])
  })

  it("a2_stops_when_there_are_no_more_pages", async () => {
    const { request } = store([{ data: [review("p1")], nextPaginationToken: null }])

    expect(await fetchGooglePlay(PLAY_APP, 500, request)).toHaveLength(1)
  })
})
