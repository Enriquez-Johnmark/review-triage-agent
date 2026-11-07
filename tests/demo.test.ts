import { describe, expect, it } from "vitest"

import { FixedClock } from "../src/clock.ts"
import { summarise } from "../src/commands/summary.ts"
import { FINANCE_CAUSES } from "../src/core/causes.ts"
import { loadDemo } from "../src/demo.ts"
import { openDb } from "../src/store/db.ts"
import { appIds, loadSettings } from "../src/store/settings.ts"

describe("the demo", () => {
  it("loads the made-up reviews once, sorted, with this week's crash spike", () => {
    const db = openDb(":memory:")
    const clock = new FixedClock(new Date("2026-11-04T02:00:00Z"))

    expect(loadDemo(db, clock)).toBe(120)
    expect(loadDemo(db, clock)).toBe(0)

    const summary = summarise(db, clock, appIds(loadSettings(db)), FINANCE_CAUSES)
    expect(summary.overview.topCauses[0]).toEqual({ cause: "crash", count: 6 })
    expect(summary.weeklySpikes.map((spike) => spike.cause)).toContain("crash")
    expect(summary.versionSpikes.map((spike) => spike.version)).toEqual(["4.2.0"])
  })
})
