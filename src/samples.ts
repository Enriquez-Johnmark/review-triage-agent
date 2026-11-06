import { readFileSync } from "node:fs"

import { z } from "zod"

import { Review } from "./core/review.ts"

/** The made-up reviews in `samples/reviews.json`. */
export function sampleReviews(): Review[] {
  const file = new URL("../samples/reviews.json", import.meta.url)
  return z.array(Review).parse(JSON.parse(readFileSync(file, "utf8")))
}
