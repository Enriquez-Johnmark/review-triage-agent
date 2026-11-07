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
 *  over the four weeks before and at least 5 reviews (C1). A week is judged
 *  only when the reviews reach back four full weeks before it, so the first
 *  weeks fetched aren't spikes just because nothing came before. Newest first. */
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
      if (count < MIN_SPIKE_REVIEWS || start - 4 * WEEK < earliest) continue
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
