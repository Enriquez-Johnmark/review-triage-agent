import { CRASH_CAUSE } from "./causes.ts"

/** Spikes: causes that jump in a week (C1) or with an app version (C2). Pure
 *  functions of stored labels; nothing here reads the clock. */

const DAY = 86_400_000
const WEEK = 7 * DAY
/** Manila is UTC+8 all year (no daylight saving). */
const MANILA = 8 * 60 * 60 * 1000

/** A spike needs at least this many reviews (spec, Round 1). */
export const MIN_SPIKE_REVIEWS = 5

/** One sorted review, as spike detection sees it. */
export interface CauseEvent {
  /** When it was written (ISO time). */
  at: string
  cause: string
}

/** The Monday, in Manila, that starts the week of `at`, as `YYYY-MM-DD`. */
export function weekOf(at: string): string {
  return weekOfStart(weekStart(Date.parse(at)))
}

/** Midnight Manila on that Monday, shifted into UTC digits: only its date is used. */
function weekStart(ms: number): number {
  const manilaDays = Math.floor((ms + MANILA) / DAY)
  // 1970-01-01 was a Thursday: day 0 is three days after a Monday.
  const sinceMonday = (manilaDays + 3) % 7
  return (manilaDays - sinceMonday) * DAY
}

export interface WeeklySpike {
  cause: string
  /** The week's Monday, `YYYY-MM-DD`. */
  week: string
  count: number
  previousAverage: number
}

/** A cause's week is a spike when its count is at least double its average
 *  over the four weeks before and at least 5 reviews (C1). The first week of
 *  reviews is taken as partial (fetching takes the newest reviews, so it holds
 *  only its last days): a week is judged only when its four weeks before all
 *  come after that one, so no week is a spike just because little came before. Newest first. */
export function weeklySpikes(events: readonly CauseEvent[]): WeeklySpike[] {
  const counts = new Map<string, Map<number, number>>()
  let earliest = Infinity
  for (const event of events) {
    const week = weekStart(Date.parse(event.at))
    earliest = Math.min(earliest, week)
    const byWeek = counts.get(event.cause) ?? new Map<number, number>()
    byWeek.set(week, (byWeek.get(week) ?? 0) + 1)
    counts.set(event.cause, byWeek)
  }
  const spikes: WeeklySpike[] = []
  for (const [cause, byWeek] of counts) {
    for (const [start, count] of byWeek) {
      if (count < MIN_SPIKE_REVIEWS || start - 4 * WEEK <= earliest) continue
      let before = 0
      for (let back = 1; back <= 4; back += 1) before += byWeek.get(start - back * WEEK) ?? 0
      const previousAverage = before / 4
      if (count >= 2 * previousAverage)
        spikes.push({ cause, week: weekOfStart(start), count, previousAverage })
    }
  }
  return spikes.sort(
    (a, b) => b.week.localeCompare(a.week) || b.count - a.count || a.cause.localeCompare(b.cause),
  )
}

const weekOfStart = (start: number) => new Date(start).toISOString().slice(0, 10)

/** One sorted review with the app version it was written about. */
export interface VersionEvent {
  appVersion: string
  cause: string
}

export interface VersionSpike {
  version: string
  previousVersion: string
  crashShare: number
  previousCrashShare: number
  crashes: number
}

/** Orders app versions by their numbers ("4.10.0" after "4.9.2"); text that
 *  isn't a number is compared as text. */
export function compareVersions(a: string, b: string): number {
  const parts = (version: string) => version.split(/[.\-+ ]/)
  const [left, right] = [parts(a), parts(b)]
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const [x, y] = [left[index] ?? "0", right[index] ?? "0"]
    const [nx, ny] = [Number(x), Number(y)]
    const order =
      Number.isInteger(nx) && Number.isInteger(ny) ? nx - ny : x.localeCompare(y, "en", { numeric: true })
    if (order !== 0) return order
  }
  return 0
}

/** A version is a spike when its share of `crashCause` reviews is at least
 *  double the previous version's (C2), and, as with weeks, at least 5 of its
 *  reviews are crashes, so a version with three reviews isn't called. The
 *  first version has nothing to be compared with. Newest version first. */
export function versionSpikes(events: readonly VersionEvent[], crashCause = CRASH_CAUSE): VersionSpike[] {
  const byVersion = new Map<string, { crashes: number; total: number }>()
  for (const event of events) {
    const counts = byVersion.get(event.appVersion) ?? { crashes: 0, total: 0 }
    counts.total += 1
    if (event.cause === crashCause) counts.crashes += 1
    byVersion.set(event.appVersion, counts)
  }
  const versions = [...byVersion.keys()].sort(compareVersions)
  const spikes: VersionSpike[] = []
  versions.forEach((version, index) => {
    const previousVersion = versions[index - 1]
    const now = byVersion.get(version)
    const before = previousVersion === undefined ? undefined : byVersion.get(previousVersion)
    if (previousVersion === undefined || !now || !before || now.crashes < MIN_SPIKE_REVIEWS) return
    // crashes/total >= 2 × before.crashes/before.total, in whole numbers.
    if (now.crashes * before.total < 2 * before.crashes * now.total) return
    spikes.push({
      version,
      previousVersion,
      crashShare: now.crashes / now.total,
      previousCrashShare: before.crashes / before.total,
      crashes: now.crashes,
    })
  })
  return spikes.reverse()
}
