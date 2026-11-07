import type { Clock } from "../clock.ts"
import { fingerprint } from "../core/fingerprint.ts"
import { checkReply } from "../core/reply-rules.ts"
import { audit } from "../store/audit.ts"
import type { Db } from "../store/db.ts"
import { type Draft, draftById, draftFor, draftSubject, saveDraft } from "../store/drafts.ts"
import { labelFor, type ReviewKey } from "../store/labels.ts"
import type { ReplySettings } from "./draft.ts"

/** Only a person approves, edits or refuses; the model's name is refused. */
function person(by: string): string {
  const name = by.trim()
  if (name === "" || name === "model") throw new Error("only a person, by name, can do this")
  return name
}

function rulesFor(db: Db, key: ReviewKey, text: string, settings: ReplySettings) {
  const language = labelFor(db, key)?.language ?? null
  return checkReply(text, { language, supportChannel: settings.supportChannel })
}

function mustFind(db: Db, id: number): Draft {
  const draft = draftById(db, id)
  if (!draft) throw new Error(`no such draft: ${String(id)}`)
  return draft
}

/** A person writes or edits a review's reply. The text is checked by the
 *  rules like a drafted one, and any approval of the old text is cancelled:
 *  the new text needs its own (E2). */
export function writeReply(
  db: Db,
  clock: Clock,
  key: ReviewKey,
  text: string,
  by: string,
  settings: ReplySettings,
): Draft {
  const writer = person(by)
  return saveDraft(db, clock, key, {
    text,
    writtenBy: writer,
    broken: rulesFor(db, key, text, settings),
    action: draftFor(db, key) ? "reply.edited" : "reply.written",
  })
}

/** A person approves a reply that keeps every rule. The approval records the
 *  fingerprint of the exact text approved (E2). */
export function approveReply(db: Db, clock: Clock, id: number, by: string, settings: ReplySettings): Draft {
  const approver = person(by)
  return db.transaction(() => {
    const draft = mustFind(db, id)
    if (draft.status !== "ready")
      throw new Error(`draft ${String(id)} is ${draft.status}, not ready to approve`)
    const broken = rulesFor(db, draft.review, draft.text, settings)
    if (broken.length > 0)
      throw new Error(`draft ${String(id)} breaks the rules: ${broken.map((rule) => rule.detail).join("; ")}`)
    const print = fingerprint(draft.text)
    db.prepare(
      `update drafts set status = 'approved', approved_fingerprint = ?, approved_by = ?, approved_at = ?,
         updated_at = ? where id = ? and status = 'ready'`,
    ).run(print, approver, clock.now().toISOString(), clock.now().toISOString(), id)
    audit(db, clock, {
      actor: approver,
      action: "reply.approved",
      subject: draftSubject(id),
      details: { fingerprint: print },
    })
    return mustFind(db, id)
  })()
}

/** A person refuses a reply; it is never posted unless rewritten and approved. */
export function refuseReply(db: Db, clock: Clock, id: number, by: string, reason: string): Draft {
  const refuser = person(by)
  return db.transaction(() => {
    const draft = mustFind(db, id)
    if (draft.status === "posted") throw new Error(`draft ${String(id)} is already posted`)
    if (db.prepare("select 1 from posts where draft_id = ?").get(id))
      throw new Error(`draft ${String(id)} is being posted; post it again to finish`)
    db.prepare(
      `update drafts set status = 'refused', approved_fingerprint = null, approved_by = null, approved_at = null,
         updated_at = ? where id = ?`,
    ).run(clock.now().toISOString(), id)
    audit(db, clock, {
      actor: refuser,
      action: "reply.refused",
      subject: draftSubject(id),
      details: { reason },
    })
    return mustFind(db, id)
  })()
}
