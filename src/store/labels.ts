import type { Clock } from "../clock.ts"
import type { Label, Outcome } from "../core/label.ts"
import type { Review, Store } from "../core/review.ts"
import { audit } from "./audit.ts"
import type { Db } from "./db.ts"
import { listReviews } from "./reviews.ts"

/** Which review: its store and the store's ID for it. */
export interface ReviewKey {
  store: Store
  storeReviewId: string
}

const subject = (key: ReviewKey) => `review:${key.store}:${key.storeReviewId}`

/** Keeps the model's outcome for a review. A cause a person set is never
 *  overwritten (B5). */
export function saveModelOutcome(
  db: Db,
  clock: Clock,
  key: ReviewKey,
  outcome: Outcome,
  model: string,
): void {
  const label = outcome.kind === "sorted" ? outcome.label : null
  db.prepare(
    `insert into labels (store, store_review_id, cause, language, money_involved, confidence, needs_person_reason,
                         set_by, model, labelled_at)
     values (@store, @storeReviewId, @cause, @language, @money, @confidence, @reason, 'model', @model, @at)
     on conflict (store, store_review_id) do update set
       cause = excluded.cause, language = excluded.language, money_involved = excluded.money_involved,
       confidence = excluded.confidence, needs_person_reason = excluded.needs_person_reason,
       model = excluded.model, labelled_at = excluded.labelled_at
     where labels.set_by = 'model'`,
  ).run({
    ...key,
    cause: label?.cause ?? null,
    language: label?.language ?? null,
    money: label ? Number(label.moneyInvolved) : null,
    confidence: label?.confidence ?? null,
    reason: outcome.kind === "needs_person" ? outcome.reason : null,
    model,
    at: clock.now().toISOString(),
  })
}

/** A person sets a review's cause by hand: it stays through later sorting
 *  runs, and the change is logged (B5). */
export function setCauseByHand(
  db: Db,
  clock: Clock,
  key: ReviewKey,
  cause: string,
  causeIds: readonly string[],
  by: string,
): void {
  if (!causeIds.includes(cause)) throw new Error(`"${cause}" isn't one of this app's causes`)
  const before = labelFor(db, key)
  db.transaction(() => {
    db.prepare(
      `insert into labels (store, store_review_id, cause, language, money_involved, confidence, needs_person_reason,
                           set_by, model, labelled_at)
       values (@store, @storeReviewId, @cause, null, null, null, null, 'person', null, @at)
       on conflict (store, store_review_id) do update set
         cause = excluded.cause, needs_person_reason = null, set_by = 'person', labelled_at = excluded.labelled_at`,
    ).run({ ...key, cause, at: clock.now().toISOString() })
    audit(db, clock, {
      actor: by,
      action: "cause.set_by_hand",
      subject: subject(key),
      details: { from: before?.cause ?? null, to: cause },
    })
  })()
}

/** A review's stored sorting, if any. */
export interface StoredLabel extends Partial<Omit<Label, "cause">> {
  cause: string | null
  needsPersonReason: string | null
  setBy: "model" | "person"
}

interface LabelRow {
  cause: string | null
  language: Label["language"] | null
  money_involved: number | null
  confidence: number | null
  needs_person_reason: string | null
  set_by: "model" | "person"
}

function fromRow(row: LabelRow): StoredLabel {
  return {
    cause: row.cause,
    needsPersonReason: row.needs_person_reason,
    setBy: row.set_by,
    ...(row.language ? { language: row.language } : {}),
    ...(row.money_involved === null ? {} : { moneyInvolved: row.money_involved === 1 }),
    ...(row.confidence === null ? {} : { confidence: row.confidence }),
  }
}

export function labelFor(db: Db, key: ReviewKey): StoredLabel | undefined {
  const row = db
    .prepare(
      `select cause, language, money_involved, confidence, needs_person_reason, set_by from labels
       where store = ? and store_review_id = ?`,
    )
    .get(key.store, key.storeReviewId) as LabelRow | undefined
  return row ? fromRow(row) : undefined
}

/** `appId`'s reviews no sorting run has handled yet. */
export function unsortedReviews(db: Db, appId: string): Review[] {
  const sorted = new Set(
    (
      db
        .prepare(
          `select l.store || ':' || l.store_review_id as k from labels l
           join reviews r on r.store = l.store and r.store_review_id = l.store_review_id where r.app_id = ?`,
        )
        .all(appId) as { k: string }[]
    ).map((row) => row.k),
  )
  return listReviews(db, appId).filter((review) => !sorted.has(`${review.store}:${review.storeReviewId}`))
}
