import { describe, expect, it } from "vitest"

import { type CauseEvent, weekOf, weeklySpikes } from "../src/core/spikes.ts"

// Weeks start on Monday, Manila time. 2026-10-05 is a Monday.
const day = (date: string) => `${date}T04:00:00.000Z`
const events = (cause: string, date: string, count: number): CauseEvent[] =>
  Array.from({ length: count }, () => ({ at: day(date), cause }))

/** The first, partial week of fetched reviews (one praise), four quiet weeks
 *  of `crash` (`before` reviews each), then `last` in the sixth. */
const history = (before: number, last: number): CauseEvent[] => [
  ...events("praise", "2026-10-03", 1),
  ...events("crash", "2026-10-05", before),
  ...events("crash", "2026-10-12", before),
  ...events("crash", "2026-10-19", before),
  ...events("crash", "2026-10-26", before),
  ...events("crash", "2026-11-02", last),
]

describe("C1", () => {
  it("c1_a_week_at_double_the_four_week_average_and_at_least_5_reviews_is_a_spike", () => {
    expect(weeklySpikes(history(3, 6))).toEqual([
      { cause: "crash", week: "2026-11-02", count: 6, previousAverage: 3 },
    ])
  })

  it("c1_a_week_just_under_double_is_not_a_spike", () => {
    expect(weeklySpikes(history(3, 5))).toEqual([])
  })

  it("c1_a_week_under_5_reviews_is_not_a_spike_even_from_nothing", () => {
    expect(weeklySpikes(history(0, 4))).toEqual([])
    expect(weeklySpikes([...events("praise", "2026-09-28", 1), ...events("crash", "2026-11-02", 5)])).toEqual(
      [{ cause: "crash", week: "2026-11-02", count: 5, previousAverage: 0 }],
    )
  })

  it("c1_weeks_without_four_earlier_weeks_of_reviews_are_not_judged", () => {
    // The first fetched week isn't a spike just because nothing came before it.
    expect(weeklySpikes(events("crash", "2026-11-02", 20))).toEqual([])
  })

  it("c1_the_first_week_fetched_is_partial_and_doesnt_count_toward_the_average", () => {
    // Fetching takes the newest reviews, so the first week holds only its last days.
    const partialFirst = [
      ...events("crash", "2026-10-10", 1),
      ...events("crash", "2026-10-12", 6),
      ...events("crash", "2026-10-19", 6),
      ...events("crash", "2026-10-26", 6),
      ...events("crash", "2026-11-02", 10),
    ]
    expect(weeklySpikes(partialFirst)).toEqual([])
  })

  it("c1_each_cause_is_judged_on_its_own_counts", () => {
    const spikes = weeklySpikes([...history(3, 3), ...events("login", "2026-11-02", 7)])
    expect(spikes.map((spike) => spike.cause)).toEqual(["login"])
  })

  it("c1_weeks_start_on_monday_in_manila", () => {
    // Sunday 23:30 Manila is still the old week; Monday 00:30 Manila is the new one.
    expect(weekOf("2026-11-01T15:30:00.000Z")).toBe("2026-10-26")
    expect(weekOf("2026-11-01T16:30:00.000Z")).toBe("2026-11-02")
  })
})
