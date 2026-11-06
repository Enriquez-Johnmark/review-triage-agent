import { describe, expect, it } from "vitest"

import { sampleReviews } from "../src/samples.ts"

describe("the made-up sample", () => {
  it("is valid reviews of the fictional app, with every language and star rating", () => {
    const reviews = sampleReviews()

    expect(reviews.length).toBeGreaterThanOrEqual(24)
    expect(new Set(reviews.map((review) => review.appId))).toEqual(new Set(["com.example.wallet"]))
    expect(new Set(reviews.map((review) => review.stars))).toEqual(new Set([1, 2, 3, 4, 5]))
    expect(new Set(reviews.map((review) => review.storeReviewId)).size).toBe(reviews.length)
  })
})
