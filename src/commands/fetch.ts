import type { Clock } from "../clock.ts"
import type { Fetched } from "../fetch/fetched.ts"
import type { Db } from "../store/db.ts"
import { type Saved, saveReviews } from "../store/reviews.ts"

/** The stores' readers, passed in so tests use made-up ones. */
export interface Fetchers {
  googlePlay(appId: string): Promise<Fetched>
  appStore(appId: string): Promise<Fetched>
}

/** Which app to fetch, by its ID in each store; either may be missing. */
export interface AppIds {
  googlePlay?: string
  appStore?: string
}

/** What a fetch did: reviews added, already there, and unreadable. */
export interface FetchReport extends Saved {
  skipped: number
}

/** Fetches new reviews of the app from each store it is in and saves them;
 *  reviews already stored are skipped (A2). */
export async function fetchNew(db: Db, clock: Clock, app: AppIds, fetchers: Fetchers): Promise<FetchReport> {
  const total: FetchReport = { added: 0, alreadyThere: 0, skipped: 0 }
  const none: Fetched = { reviews: [], skipped: 0 }
  const batches = await Promise.all([
    app.googlePlay ? fetchers.googlePlay(app.googlePlay) : Promise.resolve(none),
    app.appStore ? fetchers.appStore(app.appStore) : Promise.resolve(none),
  ])
  for (const batch of batches) {
    const saved = saveReviews(db, clock, batch.reviews)
    total.added += saved.added
    total.alreadyThere += saved.alreadyThere
    total.skipped += batch.skipped
  }
  return total
}
