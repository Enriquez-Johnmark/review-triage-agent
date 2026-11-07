import type { Cause } from "./causes.ts"
import { weekOf } from "./spikes.ts"

/** One stored review, as the overview sees it. */
export interface OverviewRow {
  at: string
  /** `null` while it waits for a person or for sorting. */
  cause: string | null
  /** The model couldn't sort it, so a person must (B2). */
  needsPerson: boolean
  companyReplied: boolean | null
}

export interface Overview {
  /** This week's Monday (Manila), `YYYY-MM-DD`. */
  week: string
  /** Reviews written this week. */
  reviews: number
  /** Of those, how many the company answered. */
  answered: number
  /** Of those, how many say whether the company answered (Apple's feed doesn't). */
  replyKnown: number
  /** `answered / replyKnown`; `null` when no review says. */
  shareAnswered: number | null
  /** The three most common causes this week; ties in the order of the app's causes. */
  topCauses: { cause: string; count: number }[]
  /** This week's reviews the model left for a person to sort. */
  needsPerson: number
  /** This week's reviews no sorting run has reached yet. */
  unsorted: number
}

/** The overview's numbers, counted from the stored reviews (F1). */
export function overview(rows: readonly OverviewRow[], now: Date, causes: readonly Cause[]): Overview {
  const week = weekOf(now.toISOString())
  return {
    week,
    ...counted(
      rows.filter((row) => weekOf(row.at) === week),
      causes,
    ),
  }
}

/** The same numbers for any set of reviews (the daily summary counts the
 *  last seven days). */
export function counted(rows: readonly OverviewRow[], causes: readonly Cause[]): Omit<Overview, "week"> {
  const known = rows.filter((row) => row.companyReplied !== null)
  const answered = known.filter((row) => row.companyReplied === true).length
  const counts = new Map<string, number>()
  for (const row of rows) if (row.cause !== null) counts.set(row.cause, (counts.get(row.cause) ?? 0) + 1)
  const order = (cause: string) => {
    const index = causes.findIndex((known) => known.id === cause)
    return index === -1 ? causes.length : index
  }
  const topCauses = [...counts]
    .map(([cause, count]) => ({ cause, count }))
    .sort((a, b) => b.count - a.count || order(a.cause) - order(b.cause))
    .slice(0, 3)
  return {
    reviews: rows.length,
    answered,
    replyKnown: known.length,
    shareAnswered: known.length === 0 ? null : answered / known.length,
    topCauses,
    needsPerson: rows.filter((row) => row.needsPerson).length,
    unsorted: rows.filter((row) => row.cause === null && !row.needsPerson).length,
  }
}
