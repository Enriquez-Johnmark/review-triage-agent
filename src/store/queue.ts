import type { Review } from "../core/review.ts"
import type { Db } from "./db.ts"
import { labelFor, type StoredLabel } from "./labels.ts"
import { listReviews } from "./reviews.ts"

/** One review waiting for a reply, with its sorting. */
export interface QueueEntry {
  review: Review
  label: StoredLabel | undefined
}

/** The reviews waiting for a reply: not yet answered (or unknown, as on the
 *  App Store), and either one or two stars or about money. Money-involved
 *  reviews come first, then the newest (B3). */
export function replyQueue(db: Db, appId: string): QueueEntry[] {
  return listReviews(db, appId)
    .filter((review) => review.companyReplied !== true)
    .map((review) => ({ review, label: labelFor(db, review) }))
    .filter(({ review, label }) => review.stars <= 2 || label?.moneyInvolved === true)
    .sort((a, b) => {
      const money = Number(b.label?.moneyInvolved === true) - Number(a.label?.moneyInvolved === true)
      return money !== 0 ? money : b.review.at.localeCompare(a.review.at)
    })
}
