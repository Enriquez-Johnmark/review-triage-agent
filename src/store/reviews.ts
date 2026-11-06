import type { Clock } from "../clock.ts"
import { Review } from "../core/review.ts"
import type { Db } from "./db.ts"

/** What saving a batch of reviews did. */
export interface Saved {
  added: number
  alreadyThere: number
}

/** Saves `reviews`. One already stored (the same store and review ID) isn't
 *  added again (A2); only a reply the company has made since is recorded. */
export function saveReviews(db: Db, clock: Clock, reviews: readonly Review[]): Saved {
  const insert = db.prepare(
    `insert into reviews (store, store_review_id, app_id, at, stars, text, app_version, company_replied, fetched_at)
     values (@store, @storeReviewId, @appId, @at, @stars, @text, @appVersion, @companyReplied, @fetchedAt)
     on conflict (store, store_review_id) do update
       set company_replied = coalesce(excluded.company_replied, reviews.company_replied)`,
  )
  const fetchedAt = clock.now().toISOString()
  const exists = db.prepare("select 1 from reviews where store = ? and store_review_id = ?")
  let added = 0
  db.transaction(() => {
    for (const review of reviews) {
      const checked = Review.parse(review)
      if (!exists.get(checked.store, checked.storeReviewId)) added += 1
      const replied = checked.companyReplied === null ? null : Number(checked.companyReplied)
      insert.run({ ...checked, companyReplied: replied, fetchedAt })
    }
  })()
  return { added, alreadyThere: reviews.length - added }
}

interface ReviewRow {
  store: Review["store"]
  store_review_id: string
  app_id: string
  at: string
  stars: number
  text: string
  app_version: string | null
  company_replied: number | null
}

/** Every stored review of `appId`, newest first. */
export function listReviews(db: Db, appId: string): Review[] {
  const rows = db
    .prepare(
      `select store, store_review_id, app_id, at, stars, text, app_version, company_replied
       from reviews where app_id = ? order by at desc, store_review_id`,
    )
    .all(appId) as ReviewRow[]
  return rows.map((row) =>
    Review.parse({
      store: row.store,
      storeReviewId: row.store_review_id,
      appId: row.app_id,
      at: row.at,
      stars: row.stars,
      text: row.text,
      appVersion: row.app_version,
      companyReplied: row.company_replied === null ? null : row.company_replied === 1,
    }),
  )
}
