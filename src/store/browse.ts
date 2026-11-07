import type { Review } from "../core/review.ts"
import { weekOf } from "../core/spikes.ts"
import type { Db } from "./db.ts"
import type { DraftStatus } from "./drafts.ts"
import { labelFromRow, type LabelRow, type ReviewKey, type StoredLabel } from "./labels.ts"
import { reviewFromRow, type ReviewRow } from "./reviews.ts"

/** One review as the dashboard lists it. */
export interface ReviewEntry {
  review: Review
  label: StoredLabel | undefined
  draftStatus: DraftStatus | null
}

/** Which reviews to list: those behind a number on the overview. */
export interface ReviewFilter {
  cause?: string | undefined
  /** A week's Monday, `YYYY-MM-DD` (Manila). */
  week?: string | undefined
  appVersion?: string | undefined
  /** Only those the model left for a person, or that no run has sorted yet. */
  waiting?: "needs_person" | "unsorted" | undefined
  /** One review only. */
  key?: ReviewKey | undefined
  limit: number
}

/** An app's reviews (`appIds`: its store IDs; `null` for one review by its
 *  key) that match `filter`, newest first. */
export function findReviews(db: Db, appIds: readonly string[] | null, filter: ReviewFilter): ReviewEntry[] {
  const rows = db
    .prepare(
      `select r.store, r.store_review_id, r.app_id, r.at, r.stars, r.text, r.app_version, r.company_replied,
              l.cause, l.language, l.money_involved, l.confidence, l.needs_person_reason, l.set_by,
              d.status as draft_status
       from reviews r
       left join labels l on l.store = r.store and l.store_review_id = r.store_review_id
       left join drafts d on d.store = r.store and d.store_review_id = r.store_review_id
       where (@apps is null or r.app_id in (select value from json_each(@apps)))
         and (@store is null or (r.store = @store and r.store_review_id = @reviewId))
         and (@cause is null or l.cause = @cause)
         and (@version is null or r.app_version = @version)
         and (@waiting is null
              or (@waiting = 'needs_person' and l.needs_person_reason is not null)
              or (@waiting = 'unsorted' and l.store is null))
       order by r.at desc, r.store, r.store_review_id`,
    )
    .all({
      apps: appIds === null ? null : JSON.stringify(appIds),
      store: filter.key?.store ?? null,
      reviewId: filter.key?.storeReviewId ?? null,
      cause: filter.cause ?? null,
      version: filter.appVersion ?? null,
      waiting: filter.waiting ?? null,
    }) as (ReviewRow & Partial<LabelRow> & { draft_status: DraftStatus | null })[]
  return rows
    .filter((row) => filter.week === undefined || weekOf(row.at) === filter.week)
    .slice(0, filter.limit)
    .map((row) => ({
      review: reviewFromRow(row),
      label: row.set_by ? labelFromRow(row as LabelRow) : undefined,
      draftStatus: row.draft_status,
    }))
}
