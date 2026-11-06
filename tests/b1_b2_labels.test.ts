import { describe, expect, it } from "vitest"

import { FINANCE_CAUSES } from "../src/core/causes.ts"
import { parseLabel } from "../src/core/label.ts"

const ids = FINANCE_CAUSES.map((cause) => cause.id)
const answer = (fields: Record<string, unknown>) =>
  JSON.stringify({ cause: "crash", language: "taglish", money_involved: false, confidence: 0.9, ...fields })

describe("B1", () => {
  it("b1_a_sorted_review_has_one_cause_a_language_a_money_flag_and_a_confidence", () => {
    expect(parseLabel(answer({}), ids, 0.6)).toEqual({
      kind: "sorted",
      label: { cause: "crash", language: "taglish", moneyInvolved: false, confidence: 0.9 },
    })
  })

  it("b1_the_finance_app_causes_are_the_agreed_list", () => {
    expect(ids).toEqual([
      "crash",
      "sign_up",
      "login",
      "id_verification",
      "failed_transaction",
      "cash_out",
      "fees",
      "support",
      "praise",
      "other",
    ])
  })
})

describe("B2", () => {
  it("b2_a_low_confidence_answer_goes_to_a_person", () => {
    expect(parseLabel(answer({ confidence: 0.4 }), ids, 0.6)).toEqual({
      kind: "needs_person",
      reason: "the model wasn't sure (0.40)",
    })
  })

  it("b2_a_cause_outside_the_list_goes_to_a_person_never_a_guess", () => {
    expect(parseLabel(answer({ cause: "loans" }), ids, 0.6).kind).toBe("needs_person")
  })

  it("b2_an_unreadable_answer_goes_to_a_person", () => {
    for (const raw of [
      "not json",
      "{}",
      answer({ confidence: 7 }),
      answer({ language: "klingon" }),
      answer({ extra: 1 }),
    ]) {
      expect(parseLabel(raw, ids, 0.6).kind, raw).toBe("needs_person")
    }
  })
})
