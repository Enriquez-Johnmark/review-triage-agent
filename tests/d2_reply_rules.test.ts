import { describe, expect, it } from "vitest"

import { checkReply, withSupport } from "../src/core/reply-rules.ts"

const SUPPORT = "Message us in the app: Help > Chat."
const rules = (body: string, language: "english" | "tagalog" | "taglish") =>
  checkReply(withSupport(body, SUPPORT), { language, supportChannel: SUPPORT }).map((broken) => broken.rule)

describe("D2", () => {
  it.each([
    ["english", "Sorry for the trouble. We will refund your money right away."],
    ["english", "Sorry for the trouble. You will get your money back within 24 hours."],
    ["english", "Sorry for the trouble. We guarantee this will be fixed by tomorrow."],
    ["tagalog", "Pasensya na po. Ibabalik po namin ang pera ninyo bukas."],
    ["tagalog", "Pasensya na po. Sigurado pong maaayos ito sa loob ng 3 araw."],
    ["taglish", "Sorry po sa abala! Ire-refund po namin agad ang pera ninyo."],
  ] as const)("d2_promises_of_refunds_outcomes_or_dates_are_caught (%s: %s)", (language, body) => {
    expect(rules(body, language)).toContain("promise")
  })

  it.each([
    ["english", "Sorry about that. Please send us your account number and OTP so we can check."],
    ["english", "Sorry about that. Reply with your PIN and we will look into it."],
    ["tagalog", "Pasensya na po. Pakibigay po ang inyong account number at password."],
    ["taglish", "Sorry po! Paki-send po ng OTP at ID number ninyo para ma-check namin."],
  ] as const)(
    "d2_requests_for_account_numbers_pins_otps_passwords_or_ids_are_caught (%s: %s)",
    (language, body) => {
      expect(rules(body, language)).toContain("asks_for_secret")
    },
  )

  it.each([
    ["english", "Sorry for the trouble. Remember that we will never ask for your PIN or OTP."],
    ["tagalog", "Pasensya na po. Huwag po ninyong ibigay ang inyong PIN o OTP kahit kanino."],
    ["taglish", "Sorry po! Never po ibigay ang OTP ninyo kahit kanino."],
    ["english", "Thank you so much for the kind words! We're happy the app helps you every day."],
    ["tagalog", "Salamat po sa magandang review! Natutuwa kami na nakakatulong ang app sa inyo."],
    ["taglish", "Sorry po sa delay ng cash out. Tinitingnan na po ito ng team namin."],
  ] as const)("d2_polite_replies_and_warnings_to_keep_a_pin_safe_pass (%s: %s)", (language, body) => {
    expect(rules(body, language)).toEqual([])
  })

  it.each([
    ["english", "Sorry, but this happened because you entered the wrong number. It was your mistake."],
    ["tagalog", "Pasensya na po, pero kasalanan po ninyo dahil mali ang numerong inilagay ninyo."],
    ["taglish", "Sorry po, pero nagkamali po kayo ng type ng number kaya nag-fail."],
  ] as const)("d2_blaming_the_customer_is_caught (%s: %s)", (language, body) => {
    expect(rules(body, language)).toContain("blames_customer")
  })
})
