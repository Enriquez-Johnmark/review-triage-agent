import type { Clock } from "./clock.ts"
import { loadLabelled } from "./commands/eval.ts"
import { sortInput } from "./commands/sort.ts"
import { FINANCE_CAUSES } from "./core/causes.ts"
import { type Outcome, parseLabel } from "./core/label.ts"
import { weekStart } from "./core/spikes.ts"
import { sortQuestion } from "./model/claude.ts"
import { recordingKey, type loadRecordings } from "./model/recorded.ts"
import type { Db } from "./store/db.ts"
import { saveModelOutcome } from "./store/labels.ts"
import { saveReviews } from "./store/reviews.ts"
import { loadSettings, saveSettings } from "./store/settings.ts"

const WEEK = 7 * 86_400_000
const HOUR = 3_600_000
// Manila is UTC+8 all year.
const MANILA_OFFSET = 8 * HOUR
export const DEMO_MODEL = "made-up demo labels"

/** Loads the 120 made-up labelled reviews as a demo that needs no API key:
 *  dated over the last nine weeks up to `clock`'s time, with version 4.2.0's
 *  crash reviews all this week and its crash share doubled (spikes). Each
 *  review gets Claude's recorded answer from `recordings`, checked as live
 *  sorting checks it, mistakes included; a review with no recorded answer
 *  gets its correct label as if sorted, one in fifteen left for a person.
 *  Running it again adds nothing. */
export function loadDemo(
  db: Db,
  clock: Clock,
  file = "samples/labelled.json",
  recordings?: NonNullable<ReturnType<typeof loadRecordings>>,
): number {
  const now = clock.now().getTime()
  // When this Manila week started, in real UTC time.
  const thisWeek = weekStart(now) - MANILA_OFFSET
  const labelled = loadLabelled(file)
  const causeIds = FINANCE_CAUSES.map((cause) => cause.id)
  const threshold = loadSettings(db).threshold
  // Looked up by the review as it was recorded, before the demo moves its date or version.
  const recorded = new Map(
    labelled.map(({ review }) => [
      review.storeReviewId,
      recordings?.answers[recordingKey(sortQuestion(sortInput(review), FINANCE_CAUSES))],
    ]),
  )
  let moved = 0
  const reviews = labelled.map(({ review, expected }, index) => {
    const spike = expected.cause === "crash" && review.appVersion === "4.2.0"
    const weeksAgo = spike ? 0 : (index % 8) + 1
    const hoursBack = ((index % 5) + 1) * HOUR
    // This week's stay inside this Manila week, however soon after Monday
    // midnight the demo is loaded; the others are whole weeks before now.
    const at = new Date(
      weeksAgo === 0
        ? now - Math.min(hoursBack, ((now - thisWeek) * ((index % 5) + 1)) / 6)
        : now - weeksAgo * WEEK - hoursBack,
    ).toISOString()
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
    const raw = recorded.get(review.storeReviewId)
    if (raw !== undefined && recordings) {
      saveModelOutcome(db, clock, key, parseLabel(raw, causeIds, threshold), recordings.model)
      continue
    }
    const madeUp: Outcome =
      index % 15 === 14
        ? { kind: "needs_person", reason: "the demo leaves some for a person" }
        : { kind: "sorted", label: { ...expected, confidence: 0.9 } }
    saveModelOutcome(db, clock, key, madeUp, DEMO_MODEL)
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
