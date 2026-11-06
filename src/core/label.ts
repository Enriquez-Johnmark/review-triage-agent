import { z } from "zod"

import { Language } from "./causes.ts"

/** The model's answer for one review, exactly as it must arrive. Anything
 *  else (extra fields, a cause outside the list) is refused. */
export function modelAnswer(causeIds: readonly string[]) {
  const [first, ...rest] = causeIds
  if (first === undefined) throw new Error("an app needs at least one cause")
  return z
    .object({
      cause: z.enum([first, ...rest]),
      language: Language,
      money_involved: z.boolean(),
      confidence: z.number().min(0).max(1),
    })
    .strict()
}

/** A review's sorting, as kept. */
export interface Label {
  cause: string
  language: Language
  moneyInvolved: boolean
  confidence: number
}

/** What became of the model's answer: sorted, or for a person to sort (B2). */
export type Outcome = { kind: "sorted"; label: Label } | { kind: "needs_person"; reason: string }

/** Reads the model's raw answer for one review. An answer that isn't valid,
 *  names a cause outside `causeIds`, or is below `threshold` confidence goes
 *  to a person; the agent never guesses a cause (B1, B2). */
export function parseLabel(raw: string, causeIds: readonly string[], threshold: number): Outcome {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { kind: "needs_person", reason: "the model's answer wasn't valid JSON" }
  }
  const parsed = modelAnswer(causeIds).safeParse(json)
  if (!parsed.success)
    return { kind: "needs_person", reason: "the model's answer didn't fit the agreed shape" }
  const { cause, language, money_involved, confidence } = parsed.data
  if (confidence < threshold) {
    return { kind: "needs_person", reason: `the model wasn't sure (${confidence.toFixed(2)})` }
  }
  return { kind: "sorted", label: { cause, language, moneyInvolved: money_involved, confidence } }
}

/** A confidence threshold as typed: a number from 0 to 1. Anything else is
 *  refused, never taken as "no threshold" (B2). */
export function parseThreshold(text: string): number {
  const value = Number(text.trim())
  if (text.trim() === "" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`the threshold must be a number from 0 to 1, like 0.6 (got "${text}")`)
  }
  return value
}
