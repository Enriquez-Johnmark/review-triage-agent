import type { Review } from "../core/review.ts"

/** What a fetch found: the reviews it could read, and how many it couldn't. */
export interface Fetched {
  reviews: Review[]
  skipped: number
}

/** Converts each store record with `convert`; one that doesn't convert (a bad
 *  date, a missing rating) is skipped and counted, so the rest are kept. */
export function convertEach<T>(records: readonly T[], convert: (record: T) => Review): Fetched {
  const reviews: Review[] = []
  let skipped = 0
  for (const record of records) {
    try {
      reviews.push(convert(record))
    } catch {
      skipped += 1
    }
  }
  return { reviews, skipped }
}
