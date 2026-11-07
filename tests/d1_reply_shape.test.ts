import { describe, expect, it } from "vitest"

import { checkReply, MAX_REPLY, replyLength, withSupport } from "../src/core/reply-rules.ts"

const SUPPORT = "Please message us in the app: Help > Chat."
const rules = (text: string, language: "english" | "tagalog" | "taglish" = "english") =>
  checkReply(text, { language, supportChannel: SUPPORT }).map((broken) => broken.rule)

describe("D1", () => {
  it("d1_a_polite_specific_reply_with_the_support_channel_passes", () => {
    const reply = withSupport("Sorry the app closes after the update. Our team is looking into it.", SUPPORT)
    expect(reply.endsWith(SUPPORT)).toBe(true)
    expect(rules(reply)).toEqual([])
  })

  it("d1_a_reply_over_350_characters_is_refused", () => {
    const body = "Sorry about the trouble with the app and your transfer. ".repeat(6)
    expect(replyLength(withSupport(body, SUPPORT))).toBeGreaterThan(MAX_REPLY)
    expect(rules(withSupport(body, SUPPORT))).toContain("too_long")
  })

  it("d1_a_reply_must_end_with_the_support_channel_from_the_settings", () => {
    expect(rules("Sorry the app closes after the update.")).toContain("no_support_channel")
    expect(rules(`${SUPPORT} Sorry the app closes after the update.`)).toContain("no_support_channel")
  })

  it("d1_a_reply_must_be_in_the_reviewers_language", () => {
    const english = withSupport("Sorry the app closes after the update. We are looking into it.", SUPPORT)
    const tagalog = withSupport(
      "Pasensya na po sa abala. Inaayos na po ng aming team ang problema sa app.",
      SUPPORT,
    )
    const taglish = withSupport(
      "Sorry po sa abala! Tinitingnan na ng team namin ang issue sa update.",
      SUPPORT,
    )
    expect(rules(english, "tagalog")).toContain("wrong_language")
    expect(rules(tagalog, "english")).toContain("wrong_language")
    expect(rules(tagalog, "tagalog")).toEqual([])
    expect(rules(taglish, "taglish")).toEqual([])
    expect(rules(english, "english")).toEqual([])
  })

  it("d1_a_reply_never_gives_contact_details_of_its_own", () => {
    expect(rules(withSupport("Sorry! Call us at 0917 123 4567.", SUPPORT))).toContain("own_contact")
    expect(rules(withSupport("Sorry! Visit https://help.example.test for help.", SUPPORT))).toContain(
      "own_contact",
    )
    expect(rules(withSupport("Sorry! Email help@example.test today.", SUPPORT))).toContain("own_contact")
  })

  it("d1_an_empty_reply_is_refused", () => {
    expect(rules(withSupport("   ", SUPPORT))).toContain("empty")
  })
})
