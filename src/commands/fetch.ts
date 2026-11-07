import type { Clock } from "../clock.ts"
import type { Cause } from "../core/causes.ts"
import type { Sorter } from "../model/sorter.ts"
import { appIds, loadSettings } from "../store/settings.ts"
import { sortPending } from "./sort.ts"
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

/** What fetching and sorting did, for the dashboard and n8n. */
export interface FetchAndSortReport {
  fetched: FetchReport
  sorted: number
  needsPerson: number
  /** True when the API key isn't set: the new reviews wait unsorted. */
  sortingSkipped: boolean
}

/** Fetches the new reviews of the app chosen in the settings, then sorts
 *  them with `sorter` when there is one (the API key is set). */
export async function fetchAndSort(
  db: Db,
  clock: Clock,
  sorter: Sorter | undefined,
  fetchers: Fetchers,
  causes: readonly Cause[],
): Promise<FetchAndSortReport> {
  const settings = loadSettings(db)
  const fetched = await fetchNew(
    db,
    clock,
    {
      ...(settings.googlePlayId ? { googlePlay: settings.googlePlayId } : {}),
      ...(settings.appStoreId ? { appStore: settings.appStoreId } : {}),
    },
    fetchers,
  )
  const sorted = []
  if (sorter)
    for (const appId of appIds(settings))
      sorted.push(await sortPending(db, clock, sorter, { appId, causes, threshold: settings.threshold }))
  return {
    fetched,
    sorted: sorted.reduce((total, report) => total + report.sorted, 0),
    needsPerson: sorted.reduce((total, report) => total + report.needsPerson, 0),
    sortingSkipped: !sorter,
  }
}
