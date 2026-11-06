import type { Review } from "../core/review.ts"
import type { Db } from "./db.ts"
import { labelFromRow, type LabelRow, type StoredLabel } from "./labels.ts"
import { reviewFromRow, type ReviewRow } from "./reviews.ts"

/** One review waiting for a reply, with its sorting. */
export interface QueueEntry {
  review: Review
  label: StoredLabel | undefined
}

/** The reviews waiting for a reply: not yet answered (or unknown, as on the
 *  App Store), and one or two stars, about money, or left for a person to
 *  sort. Money-involved reviews come first, then the newest (B3). One query. */
export function replyQueue(db: Db, appId: string): QueueEntry[] {
  const rows = db
    .prepare(
      `select r.store, r.store_review_id, r.app_id, r.at, r.stars, r.text, r.app_version, r.company_replied,
              l.cause, l.language, l.money_involved, l.confidence, l.needs_person_reason, l.set_by
       from reviews r
       left join labels l on l.store = r.store and l.store_review_id = r.store_review_id
       where r.app_id = ? and r.company_replied is not 1
         and (r.stars <= 2 or l.money_involved = 1 or l.needs_person_reason is not null)
       order by coalesce(l.money_involved, 0) desc, r.at desc, r.store_review_id`,
    )
    .all(appId) as (ReviewRow & Partial<LabelRow>)[]
  return rows.map((row) => ({
    review: reviewFromRow(row),
    label: row.set_by ? labelFromRow(row as LabelRow) : undefined,
  }))
}
