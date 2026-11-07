import type { Clock } from "../clock.ts"
import { fingerprint } from "../core/fingerprint.ts"
import type { Poster } from "../post/poster.ts"
import { audit } from "../store/audit.ts"
import type { Db } from "../store/db.ts"
import { type Draft, draftById, draftSubject } from "../store/drafts.ts"

/** What became of a post. */
export type Posted = { kind: "posted"; key: string } | { kind: "already_posted"; key: string }

/** Posts an approved reply, once. Only an approved draft whose text still
 *  matches the approved fingerprint is posted (E1, E2). Its key is recorded
 *  before the poster is called; a reply already posted is never sent again,
 *  and a post cut off by a crash is finished with the same key (E3). */
export async function postReply(
  db: Db,
  clock: Clock,
  poster: Poster,
  id: number,
  by: string,
): Promise<Posted> {
  const started = db.transaction(() => {
    const draft = draftById(db, id)
    if (!draft) throw new Error(`no such draft: ${String(id)}`)
    const existing = db.prepare("select key, status from posts where draft_id = ?").get(id) as
      { key: string; status: "sending" | "posted" } | undefined
    if (existing?.status === "posted") return { done: true as const, key: existing.key }
    if (draft.status !== "approved")
      throw new Error(`draft ${String(id)} isn't approved, so it can't be posted`)
    if (!poster.accepts(draft.review.store))
      throw new Error(
        draft.review.store === "app_store"
          ? "App Store replies need App Store Connect access: post this one by hand"
          : `${poster.name} can't post to ${draft.review.store}`,
      )
    const print = fingerprint(draft.text)
    if (draft.approvedFingerprint !== print)
      throw new Error(`draft ${String(id)} changed after it was approved; approve it again`)
    const key = existing?.key ?? `reply-${String(id)}-${print.slice(0, 16)}`
    if (!existing)
      db.prepare(
        `insert into posts (key, draft_id, fingerprint, poster, status, started_at)
         values (?, ?, ?, ?, 'sending', ?)`,
      ).run(key, id, print, poster.name, clock.now().toISOString())
    return { done: false as const, key, draft, appId: appIdOf(db, draft) }
  })()
  if (started.done) return { kind: "already_posted", key: started.key }

  const { key, draft, appId } = started
  await poster.post({
    key,
    appId,
    store: draft.review.store,
    storeReviewId: draft.review.storeReviewId,
    text: draft.text,
  })

  db.transaction(() => {
    const at = clock.now().toISOString()
    db.prepare("update posts set status = 'posted', posted_at = ? where key = ?").run(at, key)
    db.prepare("update drafts set status = 'posted', updated_at = ? where id = ?").run(at, id)
    audit(db, clock, {
      actor: by,
      action: "reply.posted",
      subject: draftSubject(id),
      details: { key, poster: poster.name, fingerprint: draft.approvedFingerprint },
    })
  })()
  return { kind: "posted", key }
}

function appIdOf(db: Db, draft: Draft): string {
  const row = db
    .prepare("select app_id from reviews where store = ? and store_review_id = ?")
    .get(draft.review.store, draft.review.storeReviewId) as { app_id: string } | undefined
  if (!row) throw new Error("the review is gone")
  return row.app_id
}
