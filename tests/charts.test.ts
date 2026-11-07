import { describe, expect, it } from "vitest"

import { causesByWeek, crashShareByVersion } from "../src/core/charts.ts"

describe("the charts' data", () => {
  it("counts causes per week for the last weeks, empty weeks included", () => {
    const bars = causesByWeek(
      [
        { at: "2026-11-03T00:00:00.000Z", cause: "crash" },
        { at: "2026-11-03T01:00:00.000Z", cause: "crash" },
        { at: "2026-10-20T00:00:00.000Z", cause: "login" },
        { at: "2025-01-01T00:00:00.000Z", cause: "login" }, // too old to show
      ],
      new Date("2026-11-04T02:00:00Z"),
      3,
    )
    expect(bars).toEqual([
      { week: "2026-10-19", counts: { login: 1 } },
      { week: "2026-10-26", counts: {} },
      { week: "2026-11-02", counts: { crash: 2 } },
    ])
  })

  it("gives each version's crash share, versions in order", () => {
    expect(
      crashShareByVersion([
        { appVersion: "4.10.0", cause: "crash" },
        { appVersion: "4.9.0", cause: "crash" },
        { appVersion: "4.9.0", cause: "login" },
      ]),
    ).toEqual([
      { version: "4.9.0", reviews: 2, crashes: 1, share: 0.5 },
      { version: "4.10.0", reviews: 1, crashes: 1, share: 1 },
    ])
  })
})
