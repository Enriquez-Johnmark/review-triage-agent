import type { Clock } from "../clock.ts"
import type { Cause } from "../core/causes.ts"
import { type Overview, overview } from "../core/overview.ts"
import { type VersionSpike, versionSpikes, type WeeklySpike, weeklySpikes } from "../core/spikes.ts"
import type { Db } from "../store/db.ts"
import { summaryRows } from "../store/summary.ts"

/** What the overview, the daily summary and the MCP tools report. */
export interface Summary {
  overview: Overview
  weeklySpikes: WeeklySpike[]
  versionSpikes: VersionSpike[]
}

/** This week's numbers and the spikes for `appId`, from the stored reviews
 *  and their causes (C1, C2, F1). */
export function summarise(db: Db, clock: Clock, appId: string, causes: readonly Cause[]): Summary {
  const rows = summaryRows(db, appId)
  const sorted = rows.flatMap((row) => (row.cause === null ? [] : [{ ...row, cause: row.cause }]))
  return {
    overview: overview(rows, clock.now(), causes),
    weeklySpikes: weeklySpikes(sorted),
    versionSpikes: versionSpikes(
      sorted.flatMap((row) =>
        row.appVersion === null ? [] : [{ appVersion: row.appVersion, cause: row.cause }],
      ),
    ),
  }
}
