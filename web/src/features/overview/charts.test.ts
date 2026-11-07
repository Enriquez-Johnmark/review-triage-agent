import { describe, expect, it } from "vitest"

import { foldCauses } from "@/features/overview/charts"

const causes = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((id) => ({
  id,
  label: id.toUpperCase(),
}))

describe("the causes chart", () => {
  it("keeps seven colours at most, folding the least common causes into Other", () => {
    const counts = Object.fromEntries(causes.map((cause, index) => [cause.id, 9 - index]))
    const { shown, folded, rows } = foldCauses([{ week: "2026-11-02", counts }], causes)
    expect(shown).toEqual(["a", "b", "c", "d", "e", "f"])
    expect(folded).toBe(true)
    expect(rows[0]).toMatchObject({ a: 9, "other causes": 3 + 2 + 1 })
  })

  it("keeps causes in their list order, so a cause keeps its colour", () => {
    const { shown } = foldCauses([{ week: "2026-11-02", counts: { b: 1, a: 5 } }], causes)
    expect(shown).toEqual(["a", "b"])
  })
})
