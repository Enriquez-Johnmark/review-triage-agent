import { describe, expect, it } from "vitest"

import { fetchAppStore } from "../src/fetch/appStore.ts"
import { APPLE_APP, applePage } from "./fixtures/store-data.ts"

const answer = (status: number, body: unknown = {}) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }))

describe("fetching the App Store", () => {
  it("a2_an_error_from_apple_is_reported_not_taken_as_no_reviews", async () => {
    await expect(fetchAppStore(APPLE_APP, 3, () => answer(503))).rejects.toThrow(/503/)
  })

  it("a2_stops_at_the_first_empty_page", async () => {
    const pages = [applePage, { feed: {} }]
    const asked: string[] = []

    const fetched = await fetchAppStore(APPLE_APP, 5, (url) => {
      asked.push(url)
      return answer(200, pages[asked.length - 1])
    })

    expect(fetched.reviews).toHaveLength(1)
    expect(asked).toHaveLength(2)
  })
})
