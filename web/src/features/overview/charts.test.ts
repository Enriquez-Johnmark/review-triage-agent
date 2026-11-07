import { describe, expect, it } from "vitest"

import { foldCauses } from "@/features/overview/charts"

const causes = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((id) => ({
  id,
  label: id.toUpperCase(),
}))

describe("the causes chart", () => {
  it("gives the first seven causes a colour each, folding the rest into Other", () => {
    const counts = Object.fromEntries(causes.map((cause, index) => [cause.id, 9 - index]))
    const { shown, folded, rows } = foldCauses([{ week: "2026-11-02", counts }], causes)
    expect(shown.map((cause) => cause.id)).toEqual(["a", "b", "c", "d", "e", "f", "g"])
    expect(folded).toBe(true)
    expect(rows[0]).toMatchObject({ a: 9, "other causes": 2 + 1 })
  })

  it("keeps a cause's colour whichever other causes appear", () => {
    const alone = foldCauses([{ week: "2026-11-02", counts: { c: 1 } }], causes).shown
    const withOthers = foldCauses([{ week: "2026-11-02", counts: { a: 4, c: 1 } }], causes).shown
    expect(alone).toEqual([{ id: "c", colour: "var(--series-3)" }])
    expect(withOthers.find((cause) => cause.id === "c")?.colour).toBe("var(--series-3)")
  })
})
