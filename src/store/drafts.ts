import type { Clock } from "../clock.ts"
import type { Broken } from "../core/reply-rules.ts"
import { audit } from "./audit.ts"
import type { Db } from "./db.ts"
import type { ReviewKey } from "./labels.ts"

export type DraftStatus = "ready" | "flagged" | "approved" | "refused" | "posted"

/** A review's reply, as stored. */
export interface Draft {
  id: number
  review: ReviewKey
  text: string
  /** "model", or the person who wrote or last edited it. */
  writtenBy: string
  status: DraftStatus
  /** The rules the text breaks, shown beside it. */
  broken: Broken[]
  approvedFingerprint: string | null
  approvedBy: string | null
}

interface DraftRow {
  id: number
  store: ReviewKey["store"]
  store_review_id: string
  text: string
  written_by: string
  status: DraftStatus
  broken: string
  approved_fingerprint: string | null
  approved_by: string | null
}

const fromRow = (row: DraftRow): Draft => ({
  id: row.id,
  review: { store: row.store, storeReviewId: row.store_review_id },
  text: row.text,
  writtenBy: row.written_by,
  status: row.status,
  broken: JSON.parse(row.broken) as Broken[],
  approvedFingerprint: row.approved_fingerprint,
  approvedBy: row.approved_by,
})

const COLUMNS =
  "id, store, store_review_id, text, written_by, status, broken, approved_fingerprint, approved_by"

export function draftById(db: Db, id: number): Draft | undefined {
  const row = db.prepare(`select ${COLUMNS} from drafts where id = ?`).get(id) as DraftRow | undefined
  return row ? fromRow(row) : undefined
}

export function draftFor(db: Db, key: ReviewKey): Draft | undefined {
  const row = db
    .prepare(`select ${COLUMNS} from drafts where store = ? and store_review_id = ?`)
    .get(key.store, key.storeReviewId) as DraftRow | undefined
  return row ? fromRow(row) : undefined
}

export const draftSubject = (id: number) => `draft:${String(id)}`

/** Keeps a new text for a review's reply and logs it (E4). A posted reply is
 *  never replaced, nor an approved one by the model; a person's edit of an
 *  approved reply cancels the approval with the old text (E2). */
export function saveDraft(
  db: Db,
  clock: Clock,
  key: ReviewKey,
  draft: { text: string; writtenBy: string; broken: readonly Broken[]; action: string; details?: object },
): Draft {
  return db.transaction(() => {
    const before = draftFor(db, key)
    if (before?.status === "posted") throw new Error(`draft ${String(before.id)} is already posted`)
    // Only a person's edit cancels an approval; a model draft never replaces one.
    if (before?.status === "approved" && draft.writtenBy === "model")
      throw new Error(`draft ${String(before.id)} was approved meanwhile; it is kept as approved`)
    if (before && db.prepare("select 1 from posts where draft_id = ?").get(before.id))
      throw new Error(
        `draft ${String(before.id)} is being posted; post it again to finish before changing it`,
      )
    const at = clock.now().toISOString()
    db.prepare(
      `insert into drafts (store, store_review_id, text, written_by, status, broken, created_at, updated_at)
       values (@store, @storeReviewId, @text, @writtenBy, @status, @broken, @at, @at)
       on conflict (store, store_review_id) do update set
         text = excluded.text, written_by = excluded.written_by, status = excluded.status,
         broken = excluded.broken, approved_fingerprint = null, approved_by = null, approved_at = null,
         updated_at = excluded.updated_at`,
    ).run({
      ...key,
      text: draft.text,
      writtenBy: draft.writtenBy,
      status: draft.broken.length === 0 ? "ready" : "flagged",
      broken: JSON.stringify(draft.broken),
      at,
    })
    const saved = draftFor(db, key)
    if (!saved) throw new Error("the draft wasn't saved")
    audit(db, clock, {
      actor: draft.writtenBy,
      action: draft.action,
      subject: draftSubject(saved.id),
      details: {
        ...draft.details,
        status: saved.status,
        broken: draft.broken.map((rule) => rule.rule),
        ...(before?.status === "approved" ? { approvalCancelled: true } : {}),
      },
    })
    return saved
  })()
}

/** An app's replies (under any of its store IDs), newest change first. */
export function listDrafts(db: Db, appIds: readonly string[]): Draft[] {
  const rows = db
    .prepare(
      `select ${COLUMNS.split(", ")
        .map((column) => `d.${column}`)
        .join(", ")}
       from drafts d join reviews r on r.store = d.store and r.store_review_id = d.store_review_id
       where r.app_id in (select value from json_each(?))
       order by updated_at desc, id desc`,
    )
    .all(JSON.stringify(appIds)) as DraftRow[]
  return rows.map(fromRow)
}
