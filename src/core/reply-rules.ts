import type { Language } from "./causes.ts"

/** Google Play's limit for a reply (spec, Round 1). */
export const MAX_REPLY = 350

/** A rule a reply broke. */
export interface Broken {
  rule:
    | "empty"
    | "too_long"
    | "no_support_channel"
    | "wrong_language"
    | "own_contact"
    | "promise"
    | "asks_for_secret"
    | "blames_customer"
  detail: string
}

export interface ReplyContext {
  /** The review's language: the reply must be in it. `null` when the model
   *  didn't sort it (a person did), and then the language isn't checked. */
  language: Language | null
  /** The support channel from the settings: every reply ends with it. */
  supportChannel: string
}

/** A reply body with the support channel added at the end, as every reply
 *  must end (D1). The model never writes the channel itself. */
/** A reply's length in characters (code points, so an emoji or "ñ" is one). */
export function replyLength(text: string): number {
  return Array.from(text).length
}

export function withSupport(body: string, supportChannel: string): string {
  return `${body.trim()}\n${supportChannel.trim()}`
}

const words = (text: string) => text.toLowerCase().match(/[\p{L}']+/gu) ?? []

// Common words of each language, for telling them apart.
const TAGALOG = new Set(
  "ang ng mga po pong opo na sa namin natin kami kayo ninyo ninyong nyo niyo inyong inyo aming ating ito iyan para lang ay nang dahil kung hindi huwag wag pero ba din rin naman agad pasensya paumanhin salamat po".split(
    " ",
  ),
)
const ENGLISH = new Set(
  "the we you your our is are to for and this that with of in it will can be please sorry thank thanks about into".split(
    " ",
  ),
)

function languageFits(body: string, language: Language): boolean {
  const all = words(body)
  const tagalog = all.filter((word) => TAGALOG.has(word)).length
  const english = all.filter((word) => ENGLISH.has(word)).length
  switch (language) {
    case "english":
      return tagalog < 2 || tagalog * 3 <= english
    case "tagalog":
      return tagalog >= 2 && english <= tagalog
    case "taglish":
      return tagalog >= 2
  }
}

const PROMISES: readonly RegExp[] = [
  // English
  /\bwe(?:'ll| will| shall)\s+(?:\w+\s+){0,2}?(?:refund|reimburse|return|credit|reverse|restore|fix|resolve|send back)/,
  /\byou(?:'ll| will)\s+(?:\w+\s+){0,2}?(?:get|receive|have)\s+(?:\w+\s+){0,2}?(?:refund|money|cash|funds)/,
  /\bwill be\s+(?:refunded|reversed|credited|returned|restored|fixed|resolved)\b/,
  /\b(?:guarantee[ds]?|promise[ds]?|assure you)\b/,
  /\bwithin\s+(?:\d+|a|an|one|two|three|a few)\s*-?\s*(?:minutes?|hours?|(?:business |banking )?days?|weeks?)\b/,
  /\b(?:by|before|until)\s+(?:today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|the end of)\b/,
  // Tagalog and Taglish
  /\b(?:i|ire|mare|mai|maire)-?refund\b/,
  /\b(?:ibabalik|maibabalik|ibalik namin)\b/,
  /\b(?:sigurado\w*|pangako|ipinapangako|makakaasa)\b/,
  /\baayusin (?:po )?namin\b/,
  /\bsa loob ng\s+(?:\d+|isang|dalawang|tatlong)\s*(?:minuto|oras|araw|linggo)\b/,
  /\bbukas\b/,
]

const SECRET =
  /\b(?:account (?:number|no\b)|acct\.? no\b|card (?:number|no\b)|m?pin|otp|one[- ]time (?:pin|password|code)|password|passcode|cvv|id (?:number|no\b)|numero ng account)/
const REQUEST =
  /\b(?:send|give|share|provide|tell|enter|type|reply with|dm|forward|include|confirm|ibigay|bigay|ipadala|padala|i-?send|i-?share|sabihin|ilagay|i-?message|i-?pm|i-?dm|paki-?\w*)\b/
const NEGATION = /\b(?:never|don't|do not|not|huwag|wag|hindi|kailanman)\b/

const BLAME: readonly RegExp[] = [
  /\b(?:your|ur) (?:own )?(?:fault|mistake|error)\b/,
  /\bbecause you\b/,
  /\byou (?:should have|failed to|forgot|did not|didn't|entered (?:the |a )?wrong|typed (?:the |a )?wrong)\b/,
  /\buser error\b/,
  /\bkasalanan (?:po )?(?:mo|ninyo|nyo|niyo)\b/,
  /\bnagkamali (?:po )?(?:ka|kayo)\b/,
  /\bmali (?:po )?(?:mo|ninyo|nyo|niyo)\b/,
  /\bdahil sa (?:iyo|inyo)\b/,
]

const URL = /https?:\/\/|\bwww\.|\b[\w-]+\.(?:com|ph|net|org|app|io|test)\b/
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/
const PHONE = /\+?\d[\d\s().-]{5,}\d/g

function ownContact(body: string): string | undefined {
  if (URL.test(body)) return "a link"
  if (EMAIL.test(body)) return "an email address"
  const phone = (body.match(PHONE) ?? []).find((run) => run.replace(/\D/g, "").length >= 7)
  return phone === undefined ? undefined : "a phone number"
}

const sentences = (text: string) => text.split(/(?<=[.!?])\s+|\n+/)

/** Checks a reply before a person sees it (D1, D2): its length, the support
 *  channel at the end, the reviewer's language, and the rules against
 *  promises, asking for secrets, blaming the customer and making up contact
 *  details. Every broken rule is returned; an empty list means it passes. */
export function checkReply(text: string, context: ReplyContext): Broken[] {
  const broken: Broken[] = []
  const channel = context.supportChannel.trim()
  const trimmed = text.trimEnd()
  const endsWithChannel = channel !== "" && trimmed.endsWith(channel)
  const body = endsWithChannel ? trimmed.slice(0, -channel.length).trim() : trimmed.trim()
  const lower = body.toLowerCase()

  if (body === "") broken.push({ rule: "empty", detail: "the reply says nothing" })
  if (replyLength(text) > MAX_REPLY)
    broken.push({
      rule: "too_long",
      detail: `${String(replyLength(text))} characters; at most ${String(MAX_REPLY)}`,
    })
  if (!endsWithChannel)
    broken.push({ rule: "no_support_channel", detail: "the reply must end with the support channel" })
  if (body !== "" && context.language !== null && !languageFits(body, context.language))
    broken.push({ rule: "wrong_language", detail: `the review is in ${context.language}` })
  const contact = ownContact(body)
  if (contact) broken.push({ rule: "own_contact", detail: `the reply gives ${contact} of its own` })
  const promise = PROMISES.find((pattern) => pattern.test(lower))
  if (promise) broken.push({ rule: "promise", detail: `promises a refund, an outcome or a date` })
  const asks = sentences(lower).find(
    (sentence) => SECRET.test(sentence) && REQUEST.test(sentence) && !NEGATION.test(sentence),
  )
  if (asks)
    broken.push({ rule: "asks_for_secret", detail: "asks for an account number, PIN, OTP, password or ID" })
  if (BLAME.some((pattern) => pattern.test(lower)))
    broken.push({ rule: "blames_customer", detail: "blames the customer" })
  return broken
}
