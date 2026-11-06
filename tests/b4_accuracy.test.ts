import { describe, expect, it } from "vitest"

import { evaluate, loadLabelled } from "../src/commands/eval.ts"
import { FINANCE_CAUSES } from "../src/core/causes.ts"
import { loadRecordings, RecordedSorter } from "../src/model/recorded.ts"
import { confident, FakeSorter } from "./fixtures/sorters.ts"

const labelled = loadLabelled(new URL("../samples/labelled.json", import.meta.url))
const recordings = loadRecordings(new URL("../samples/recorded-labels.json", import.meta.url).pathname)

describe("the labelled made-up set", () => {
  it("b4_has_12_reviews_for_each_finance_cause", () => {
    const perCause = new Map<string, number>()
    for (const { expected } of labelled) perCause.set(expected.cause, (perCause.get(expected.cause) ?? 0) + 1)

    expect(labelled).toHaveLength(120)
    expect([...perCause.keys()]).toEqual(FINANCE_CAUSES.map((cause) => cause.id))
    expect(new Set(perCause.values())).toEqual(new Set([12]))
  })
})

describe("evaluate", () => {
  it("b4_scores_a_sorter_and_counts_a_review_sent_to_a_person_as_not_right", async () => {
    const answers = new Map(labelled.map(({ review, expected }) => [review.text, expected]))
    let call = 0
    const sorter = new FakeSorter((input) => {
      call += 1
      const expected = answers.get(input.text)
      if (!expected) throw new Error("not in the set")
      if (call === 1) return JSON.stringify({ ...JSON.parse(confident(expected.cause)), confidence: 0.1 })
      if (call === 2) return confident("other" === expected.cause ? "praise" : "other")
      return JSON.stringify({
        cause: expected.cause,
        language: expected.language,
        money_involved: expected.moneyInvolved,
        confidence: 0.9,
      })
    })

    const report = await evaluate(labelled, sorter, FINANCE_CAUSES, 0.6)

    expect(report).toMatchObject({ total: 120, accuracy: 118 / 120, needsPerson: 1 / 120, failed: 0 })
    expect(report.mistakes).toHaveLength(2)
  })
})

describe("B4", () => {
  // The recordings come from `pnpm cli eval --record`, run once with the
  // owner's API key; until then there is nothing real to check.
  it.skipIf(!recordings)(
    "b4_sorting_gets_the_right_cause_for_at_least_85_percent_of_the_made_up_set",
    async () => {
      if (!recordings) return
      const report = await evaluate(labelled, new RecordedSorter(recordings), FINANCE_CAUSES, 0.6)

      expect(report.failed, "every labelled review has a recorded answer").toBe(0)
      expect(report.accuracy).toBeGreaterThanOrEqual(0.85)
    },
  )
})
