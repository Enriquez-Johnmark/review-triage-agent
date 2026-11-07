import { describe, expect, it } from "vitest"

import { compareVersions, type VersionEvent, versionSpikes } from "../src/core/spikes.ts"

const reviews = (appVersion: string, crashes: number, others: number): VersionEvent[] => [
  ...Array.from({ length: crashes }, () => ({ appVersion, cause: "crash" })),
  ...Array.from({ length: others }, () => ({ appVersion, cause: "login" })),
]

describe("C2", () => {
  it("c2_a_version_with_double_the_previous_versions_crash_share_is_a_spike", () => {
    // 4.1.9: 2 of 10 crash (20%); 4.2.0: 6 of 15 (40%).
    expect(versionSpikes([...reviews("4.1.9", 2, 8), ...reviews("4.2.0", 6, 9)])).toEqual([
      { version: "4.2.0", previousVersion: "4.1.9", crashShare: 0.4, previousCrashShare: 0.2, crashes: 6 },
    ])
  })

  it("c2_a_version_just_under_double_is_not_a_spike", () => {
    expect(versionSpikes([...reviews("4.1.9", 2, 8), ...reviews("4.2.0", 6, 10)])).toEqual([])
  })

  it("c2_versions_are_compared_by_number_not_by_text", () => {
    expect(compareVersions("4.10.0", "4.9.2")).toBeGreaterThan(0)
    // 4.10.0 follows 4.9.2, so it is compared with 4.9.2, not with 4.2.0.
    const spikes = versionSpikes([
      ...reviews("4.2.0", 0, 10),
      ...reviews("4.9.2", 5, 5),
      ...reviews("4.10.0", 10, 0),
    ])
    expect(spikes.map((spike) => [spike.version, spike.previousVersion])).toEqual([
      ["4.10.0", "4.9.2"],
      ["4.9.2", "4.2.0"],
    ])
  })

  it("c2_a_version_with_fewer_than_5_crash_reviews_is_not_a_spike", () => {
    // 3 of 3 is a share of 100%, but three reviews are too few to call.
    expect(versionSpikes([...reviews("4.1.9", 1, 9), ...reviews("4.2.0", 3, 0)])).toEqual([])
  })

  it("c2_the_first_version_has_nothing_to_be_compared_with", () => {
    expect(versionSpikes(reviews("4.2.0", 9, 1))).toEqual([])
  })

  it("c2_the_crash_cause_can_be_named_for_apps_with_their_own_causes", () => {
    const events = [
      ...Array.from({ length: 10 }, () => ({ appVersion: "2.0", cause: "other" })),
      ...Array.from({ length: 5 }, () => ({ appVersion: "2.1", cause: "freezes" })),
    ]
    expect(versionSpikes(events, "freezes").map((spike) => spike.version)).toEqual(["2.1"])
  })
})
