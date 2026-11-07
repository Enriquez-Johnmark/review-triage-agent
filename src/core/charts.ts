import {
  type CauseEvent,
  compareVersions,
  type VersionEvent,
  WEEK,
  weekOfStart,
  weekStart,
} from "./spikes.ts"

/** One bar of the causes-by-week chart: each cause's count that week. */
export interface WeekBar {
  week: string
  counts: Record<string, number>
}

/** Sorted reviews per cause for the last `weeks` weeks up to `now`'s week,
 *  oldest first; weeks with no reviews are there with no counts. */
export function causesByWeek(events: readonly CauseEvent[], now: Date, weeks = 12): WeekBar[] {
  const last = weekStart(now.getTime())
  const bars = Array.from(
    { length: weeks },
    (_, index): { start: number; counts: Record<string, number> } => ({
      start: last - (weeks - 1 - index) * WEEK,
      counts: {},
    }),
  )
  const byStart = new Map(bars.map((bar) => [bar.start, bar.counts]))
  for (const event of events) {
    const counts = byStart.get(weekStart(Date.parse(event.at)))
    if (counts) counts[event.cause] = (counts[event.cause] ?? 0) + 1
  }
  return bars.map((bar) => ({ week: weekOfStart(bar.start), counts: bar.counts }))
}

/** One point of the crash-share line. */
export interface VersionPoint {
  version: string
  reviews: number
  crashes: number
  share: number
}

/** Each app version's share of crash reviews among its sorted reviews,
 *  oldest version first. */
export function crashShareByVersion(events: readonly VersionEvent[], crashCause = "crash"): VersionPoint[] {
  const byVersion = new Map<string, { reviews: number; crashes: number }>()
  for (const event of events) {
    const point = byVersion.get(event.appVersion) ?? { reviews: 0, crashes: 0 }
    point.reviews += 1
    if (event.cause === crashCause) point.crashes += 1
    byVersion.set(event.appVersion, point)
  }
  return [...byVersion]
    .sort(([a], [b]) => compareVersions(a, b))
    .map(([version, point]) => ({ version, ...point, share: point.crashes / point.reviews }))
}
