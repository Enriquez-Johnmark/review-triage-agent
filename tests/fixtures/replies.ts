// Made-up reviews and model replies for the reply tests. Every review here is invented.

import { FixedClock } from "../../src/clock.ts"
import type { ReplySettings } from "../../src/commands/draft.ts"
import { FINANCE_CAUSES } from "../../src/core/causes.ts"
import type { Review } from "../../src/core/review.ts"
import type { DraftGuide, DraftInput, Drafter } from "../../src/model/drafter.ts"
import { openDb } from "../../src/store/db.ts"
import { saveModelOutcome } from "../../src/store/labels.ts"
import { saveReviews } from "../../src/store/reviews.ts"

export const SUPPORT = "Message us in the app: Help > Chat."
export const settings: ReplySettings = { causes: FINANCE_CAUSES, supportChannel: SUPPORT }
export const KEY = { store: "google_play", storeReviewId: "gp-crash" } as const

/** Answers each call with the next reply, remembering what it was shown. */
export class FakeDrafter implements Drafter {
  readonly model = "fake-drafter"
  readonly seen: { input: DraftInput; guide: DraftGuide }[] = []
  constructor(private readonly replies: readonly string[]) {}
  draft(input: DraftInput, guide: DraftGuide): Promise<string> {
    this.seen.push({ input, guide })
    const reply = this.replies[this.seen.length - 1] ?? this.replies.at(-1) ?? ""
    return Promise.resolve(JSON.stringify({ reply }))
  }
}

export const GOOD = "Sorry the app closes after the update. Our team is looking into it."
export const PROMISE = "Sorry! We will refund your money by tomorrow."

/** One sorted English crash review, ready for a reply. */
export function world() {
  const db = openDb(":memory:")
  const clock = new FixedClock(new Date("2026-11-04T02:00:00Z"))
  const review: Review = {
    store: "google_play",
    storeReviewId: KEY.storeReviewId,
    appId: "com.example.wallet",
    at: "2026-11-03T00:00:00.000Z",
    stars: 1,
    text: "The app closes right after the update. Juan here, pls fix!",
    appVersion: "4.2.0",
    companyReplied: false,
  }
  saveReviews(db, clock, [review])
  saveModelOutcome(
    db,
    clock,
    KEY,
    { kind: "sorted", label: { cause: "crash", language: "english", moneyInvolved: false, confidence: 0.9 } },
    "fake-sorter",
  )
  return { db, clock, review }
}
