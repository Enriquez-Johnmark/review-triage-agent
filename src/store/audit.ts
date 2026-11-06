import type { Clock } from "../clock.ts"
import type { Db } from "./db.ts"

/** One entry in the append-only audit log (E4). */
export interface AuditEntry {
  actor: string
  action: string
  subject: string
  details?: Record<string, unknown>
}

export function audit(db: Db, clock: Clock, entry: AuditEntry): void {
  db.prepare("insert into audit_log (at, actor, action, subject, details) values (?, ?, ?, ?, ?)").run(
    clock.now().toISOString(),
    entry.actor,
    entry.action,
    entry.subject,
    JSON.stringify(entry.details ?? {}),
  )
}

/** The log, oldest first. */
export function auditLog(db: Db): (AuditEntry & { at: string })[] {
  const rows = db.prepare("select at, actor, action, subject, details from audit_log order by id").all() as {
    at: string
    actor: string
    action: string
    subject: string
    details: string
  }[]
  return rows.map((row) => ({ ...row, details: JSON.parse(row.details) as Record<string, unknown> }))
}
