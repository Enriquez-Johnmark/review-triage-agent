import type { Db } from "./db.ts"

/** One review of an app with its cause, if it has one. */
export interface SummaryRow {
  at: string
  appVersion: string | null
  cause: string | null
  companyReplied: boolean | null
}

/** Every stored review of an app, under any of its store IDs (`appIds`: its
 *  Google Play and App Store IDs), with its cause, oldest first. One query. */
export function summaryRows(db: Db, appIds: readonly string[]): SummaryRow[] {
  const rows = db
    .prepare(
      `select r.at, r.app_version, r.company_replied, l.cause
       from reviews r
       left join labels l on l.store = r.store and l.store_review_id = r.store_review_id
       where r.app_id in (select value from json_each(?))
       order by r.at, r.store, r.store_review_id`,
    )
    .all(JSON.stringify(appIds)) as {
    at: string
    app_version: string | null
    company_replied: number | null
    cause: string | null
  }[]
  return rows.map((row) => ({
    at: row.at,
    appVersion: row.app_version,
    cause: row.cause,
    companyReplied: row.company_replied === null ? null : row.company_replied === 1,
  }))
}
