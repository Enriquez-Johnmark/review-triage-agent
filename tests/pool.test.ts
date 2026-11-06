import { describe, expect, it } from "vitest"

import { evaluate, loadLabelled } from "../src/commands/eval.ts"
import { FINANCE_CAUSES } from "../src/core/causes.ts"
import { inPool } from "../src/pool.ts"
import { confident } from "./fixtures/sorters.ts"

describe("inPool", () => {
  it("runs at most `size` at once and keeps the order", async () => {
    let running = 0
    let most = 0
    const results = await inPool([1, 2, 3, 4, 5, 6], 3, async (n) => {
      running += 1
      most = Math.max(most, running)
      await new Promise((resolve) => setTimeout(resolve, 5))
      running -= 1
      return n * 10
    })

    expect(results).toEqual([10, 20, 30, 40, 50, 60])
    expect(most).toBe(3)
  })
})

describe("evaluate", () => {
  it("b4_asks_the_model_about_several_reviews_at_once", async () => {
    const labelled = loadLabelled(new URL("../samples/labelled.json", import.meta.url))
    let running = 0
    let most = 0
    const sorter = {
      model: "slow",
      question: (input: unknown) => input,
      sort: async () => {
        running += 1
        most = Math.max(most, running)
        await new Promise((resolve) => setTimeout(resolve, 1))
        running -= 1
        return confident("other")
      },
    }

    await evaluate(labelled, sorter, FINANCE_CAUSES, 0.6)

    expect(most).toBe(4)
  })
})
