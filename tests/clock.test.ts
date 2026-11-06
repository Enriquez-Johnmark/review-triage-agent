import { describe, expect, it } from "vitest"

import { FixedClock } from "../src/clock.ts"

describe("FixedClock", () => {
  it("moves only when told to", () => {
    const clock = new FixedClock(new Date("2026-11-02T01:00:00Z"))
    clock.advanceDays(7)
    expect(clock.now().toISOString()).toBe("2026-11-09T01:00:00.000Z")
  })
})
