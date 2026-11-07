import { describe, expect, it } from "vitest"

import { parseDraft, replyQuestion } from "../src/model/claudeDrafter.ts"

describe("D4", () => {
  it("d4_the_reply_question_carries_only_the_reviews_text_stars_version_and_cause", () => {
    const question = replyQuestion(
      { text: "Ayaw mag open", stars: 1, appVersion: "4.2.0", cause: "Crash or won't open" },
      { maxLength: 300, broke: [] },
    )
    const sent = JSON.parse(question.user.replace(/^<review>\n|\n<\/review>$/g, "")) as object
    expect(Object.keys(sent).sort()).toEqual(["appVersion", "cause", "stars", "text"])
  })

  it("d4_a_redraft_says_which_rules_broke_but_shows_nothing_more_of_the_review", () => {
    const input = { text: "No refund yet", stars: 1, appVersion: null, cause: "Failed transaction" }
    const first = replyQuestion(input, { maxLength: 300, broke: [] })
    const second = replyQuestion(input, { maxLength: 300, broke: ["promise"] })
    expect(second.user).toBe(first.user)
    expect(second.system).toContain("promised a refund, an outcome or a date")
  })
})

describe("the model's reply answer", () => {
  it("is read only in the agreed shape", () => {
    expect(parseDraft('{"reply":"Sorry po!"}')).toBe("Sorry po!")
    expect(parseDraft('{"reply":"x","sign":"Ana"}')).toBeUndefined()
    expect(parseDraft("Sorry po!")).toBeUndefined()
  })
})
