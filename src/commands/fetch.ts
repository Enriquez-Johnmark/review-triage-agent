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

/** What a fetch did: reviews added, already there and unreadable, and each
 *  store that failed, with why. */
export interface FetchReport extends Saved {
  skipped: number
  failed: string[]
}

/** Fetches new reviews of the app from each store it is in and saves them;
 *  reviews already stored are skipped (A2). A store that fails is reported,
 *  and the other store's reviews are still saved. */
export async function fetchNew(db: Db, clock: Clock, app: AppIds, fetchers: Fetchers): Promise<FetchReport> {
  const total: FetchReport = { added: 0, alreadyThere: 0, skipped: 0, failed: [] }
  const none: Fetched = { reviews: [], skipped: 0 }
  const stores = [
    {
      name: "Google Play",
      fetch: app.googlePlay ? fetchers.googlePlay(app.googlePlay) : Promise.resolve(none),
    },
    { name: "App Store", fetch: app.appStore ? fetchers.appStore(app.appStore) : Promise.resolve(none) },
  ]
  const results = await Promise.allSettled(stores.map((store) => store.fetch))
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
      total.failed.push(`${stores[index]?.name ?? "A store"}: ${reason}`)
      continue
    }
    const batch = result.value
    const saved = saveReviews(db, clock, batch.reviews)
    total.added += saved.added
    total.alreadyThere += saved.alreadyThere
    total.skipped += batch.skipped
  }
  return total
}
