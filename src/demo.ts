import type { Clock } from "./clock.ts"
import { loadLabelled } from "./commands/eval.ts"
import type { Db } from "./store/db.ts"
import { saveModelOutcome } from "./store/labels.ts"
import { saveReviews } from "./store/reviews.ts"
import { loadSettings, saveSettings } from "./store/settings.ts"

const WEEK = 7 * 86_400_000
const HOUR = 3_600_000
export const DEMO_MODEL = "made-up demo labels"

/** Loads the 120 made-up labelled reviews as a demo that needs no API key:
 *  dated over the last nine weeks up to `clock`'s time, with version 4.2.0's
 *  crash reviews all this week and its crash share doubled (spikes), and their correct labels stored as
 *  if sorted, one in fifteen left for a person. Running it again adds nothing. */
export function loadDemo(db: Db, clock: Clock, file = "samples/labelled.json"): number {
  const now = clock.now().getTime()
  const labelled = loadLabelled(file)
  let moved = 0
  const reviews = labelled.map(({ review, expected }, index) => {
    const spike = expected.cause === "crash" && review.appVersion === "4.2.0"
    const weeksAgo = spike ? 0 : (index % 8) + 1
    const at = new Date(now - weeksAgo * WEEK - ((index % 5) + 1) * HOUR).toISOString()
    // Half of 4.2.0's other reviews move to 4.1.9, so 4.2.0's crash share stands out.
    const move = !spike && review.appVersion === "4.2.0" && (moved += 1) % 2 === 0
    const appVersion = move ? "4.1.9" : review.appVersion
    return { review: { ...review, at, appVersion }, expected, index }
  })
  const saved = saveReviews(
    db,
    clock,
    reviews.map((entry) => entry.review),
  )
  for (const { review, expected, index } of reviews) {
    const key = { store: review.store, storeReviewId: review.storeReviewId }
    saveModelOutcome(
      db,
      clock,
      key,
      index % 15 === 14
        ? { kind: "needs_person", reason: "the demo leaves some for a person" }
        : { kind: "sorted", label: { ...expected, confidence: 0.9 } },
      DEMO_MODEL,
    )
  }
  const settings = loadSettings(db)
  if (!settings.googlePlayId)
    saveSettings(
      db,
      clock,
      {
        googlePlayId: "com.example.wallet",
        supportChannel: settings.supportChannel || "Message us in the app: Help > Chat.",
      },
      "demo",
    )
  return saved.added
}
