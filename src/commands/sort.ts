import type { Clock } from "../clock.ts"
import type { Cause } from "../core/causes.ts"
import { parseLabel } from "../core/label.ts"
import type { Review } from "../core/review.ts"
import type { SortInput, Sorter } from "../model/sorter.ts"
import { inPool } from "../pool.ts"
import type { Db } from "../store/db.ts"
import { saveModelOutcome, unsortedReviews } from "../store/labels.ts"

/** How sorting is set up for one app. */
export interface SortSettings {
  appId: string
  causes: readonly Cause[]
  /** Below this confidence a review goes to a person (B2). */
  threshold: number
}

/** What a sorting run did. */
export interface SortReport {
  sorted: number
  needsPerson: number
  /** Model calls that failed (network, rate limit); those reviews stay
   *  unsorted and are tried again next run. */
  failed: number
}

/** Only what the model may see (D4). */
export function sortInput(review: Review): SortInput {
  return { text: review.text, stars: review.stars, appVersion: review.appVersion }
}

/** Sorts `settings.appId`'s reviews that no run has sorted yet, a few at a
 *  time. A cause a person set is never touched (B5). */
export async function sortPending(
  db: Db,
  clock: Clock,
  sorter: Sorter,
  settings: SortSettings,
  inParallel = 4,
): Promise<SortReport> {
  const report: SortReport = { sorted: 0, needsPerson: 0, failed: 0 }
  const causeIds = settings.causes.map((cause) => cause.id)
  await inPool(unsortedReviews(db, settings.appId), inParallel, async (review) => {
    let raw: string
    try {
      raw = await sorter.sort(sortInput(review), settings.causes)
    } catch {
      report.failed += 1
      return
    }
    const outcome = parseLabel(raw, causeIds, settings.threshold)
    saveModelOutcome(db, clock, review, outcome, sorter.model)
    if (outcome.kind === "sorted") report.sorted += 1
    else report.needsPerson += 1
  })
  return report
}
