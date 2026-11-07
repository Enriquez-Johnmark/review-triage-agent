import type { Clock } from "../clock.ts"
import type { Cause } from "../core/causes.ts"
import { type Broken, checkReply, MAX_REPLY, replyLength, withSupport } from "../core/reply-rules.ts"
import { parseDraft } from "../model/claudeDrafter.ts"
import type { Drafter } from "../model/drafter.ts"
import type { Db } from "../store/db.ts"
import { type Draft, draftFor, saveDraft } from "../store/drafts.ts"
import { labelFor, type ReviewKey } from "../store/labels.ts"
import { reviewFromRow, type ReviewRow } from "../store/reviews.ts"

/** What replies are written with. */
export interface ReplySettings {
  causes: readonly Cause[]
  /** Added to the end of every reply (D1). */
  supportChannel: string
}

/** Has the model write a reply to one sorted review. The body is checked by
 *  the rules with the support channel added; a draft that breaks one is
 *  redrafted once, told which rules broke, and one that breaks one again is
 *  flagged for a person to write (D3). Either way it waits for a person. */
export async function draftReply(
  db: Db,
  clock: Clock,
  drafter: Drafter,
  settings: ReplySettings,
  key: ReviewKey,
): Promise<Draft> {
  const row = db
    .prepare(
      `select store, store_review_id, app_id, at, stars, text, app_version, company_replied
       from reviews where store = ? and store_review_id = ?`,
    )
    .get(key.store, key.storeReviewId) as ReviewRow | undefined
  if (!row) throw new Error(`no such review: ${key.store} ${key.storeReviewId}`)
  const review = reviewFromRow(row)
  const label = labelFor(db, key)
  if (!label?.cause) throw new Error("sort the review before drafting a reply: it has no cause yet")
  const existing = draftFor(db, key)
  if (existing && (existing.status === "approved" || existing.status === "posted"))
    throw new Error(`the reply is already ${existing.status}`)

  const cause = settings.causes.find((known) => known.id === label.cause)?.label ?? label.cause
  const input = { text: review.text, stars: review.stars, appVersion: review.appVersion, cause }
  const context = { language: label.language ?? null, supportChannel: settings.supportChannel }
  const maxLength = MAX_REPLY - replyLength(settings.supportChannel.trim()) - 1

  let broke: readonly string[] = []
  let text = ""
  let broken: Broken[] = []
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    text = withSupport(
      parseDraft(await drafter.draft(input, { maxLength, broke })) ?? "",
      settings.supportChannel,
    )
    broken = checkReply(text, context)
    if (broken.length === 0) break
    broke = broken.map((rule) => rule.rule)
  }
  return saveDraft(db, clock, key, {
    text,
    writtenBy: "model",
    broken,
    action: "reply.drafted",
    details: { model: drafter.model },
  })
}
