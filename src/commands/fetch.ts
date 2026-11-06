import type { Clock } from "../clock.ts"
import type { Review } from "../core/review.ts"
import type { Db } from "../store/db.ts"
import { type Saved, saveReviews } from "../store/reviews.ts"

/** The stores' readers, passed in so tests use made-up ones. */
export interface Fetchers {
  googlePlay(appId: string): Promise<Review[]>
  appStore(appId: string): Promise<Review[]>
}

/** Which app to fetch, by its ID in each store; either may be missing. */
export interface AppIds {
  googlePlay?: string
  appStore?: string
}

/** Fetches new reviews of the app from each store it is in and saves them;
 *  reviews already stored are skipped (A2). */
export async function fetchNew(db: Db, clock: Clock, app: AppIds, fetchers: Fetchers): Promise<Saved> {
  const total: Saved = { added: 0, alreadyThere: 0 }
  const batches = await Promise.all([
    app.googlePlay ? fetchers.googlePlay(app.googlePlay) : Promise.resolve([]),
    app.appStore ? fetchers.appStore(app.appStore) : Promise.resolve([]),
  ])
  for (const batch of batches) {
    const saved = saveReviews(db, clock, batch)
    total.added += saved.added
    total.alreadyThere += saved.alreadyThere
  }
  return total
}
