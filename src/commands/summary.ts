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

/** This week's numbers and the spikes for an app (`appIds`: its store IDs), from the stored reviews
 *  and their causes (C1, C2, F1). */
export function summarise(
  db: Db,
  clock: Clock,
  appIds: readonly string[],
  causes: readonly Cause[],
): Summary {
  const rows = summaryRows(db, appIds)
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

const percent = (share: number) => `${(share * 100).toFixed(0)}%`

/** The summary as text, for the `summary` command. */
export function formatSummary(summary: Summary, causes: readonly Cause[]): string {
  const name = (id: string) => causes.find((cause) => cause.id === id)?.label ?? id
  const { overview: week } = summary
  return [
    `Week of ${week.week}: ${String(week.reviews)} reviews, ${String(week.needsPerson)} waiting for a person, ${String(week.unsorted)} not sorted yet`,
    `Answered: ${week.shareAnswered === null ? "not known" : `${percent(week.shareAnswered)} (${String(week.answered)} of ${String(week.replyKnown)})`}`,
    `Top causes: ${week.topCauses.map((top) => `${name(top.cause)} ${String(top.count)}`).join(", ") || "none yet"}`,
    "",
    "Spikes by week:",
    ...(summary.weeklySpikes.length === 0 ? ["  none"] : []),
    ...summary.weeklySpikes.map(
      (spike) =>
        `  ${spike.week}  ${name(spike.cause)}: ${String(spike.count)} (four-week average ${spike.previousAverage.toFixed(1)})`,
    ),
    "Spikes by app version:",
    ...(summary.versionSpikes.length === 0 ? ["  none"] : []),
    ...summary.versionSpikes.map(
      (spike) =>
        `  ${spike.version}  crashes ${percent(spike.crashShare)} (${spike.previousVersion}: ${percent(spike.previousCrashShare)})`,
    ),
  ].join("\n")
}
