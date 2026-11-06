import { readFileSync } from "node:fs"

import { z } from "zod"

import type { Cause } from "../core/causes.ts"
import { Language } from "../core/causes.ts"
import { parseLabel } from "../core/label.ts"
import { Review } from "../core/review.ts"
import type { Sorter } from "../model/sorter.ts"
import { inPool } from "../pool.ts"
import { sortInput } from "./sort.ts"

/** A review with the sorting a person decided is right. */
export const LabelledReview = z.object({
  review: Review,
  expected: z.object({ cause: z.string(), language: Language, moneyInvolved: z.boolean() }).strict(),
})
export type LabelledReview = z.infer<typeof LabelledReview>

export function loadLabelled(file: string | URL): LabelledReview[] {
  return z.array(LabelledReview).parse(JSON.parse(readFileSync(file, "utf8")))
}

/** How well a sorter did on a labelled set. A review sent to a person counts
 *  as not right: the score is what the agent gets right on its own. */
export interface EvalReport {
  total: number
  /** Share with the right cause. */
  accuracy: number
  /** Share sent to a person. */
  needsPerson: number
  /** Shares with the right language and the right money flag, among sorted ones. */
  languageAccuracy: number
  moneyAccuracy: number
  perCause: Record<string, { total: number; right: number }>
  mistakes: { id: string; expected: string; got: string }[]
  /** Reviews whose model call failed (no recording, network). */
  failed: number
}

export async function evaluate(
  set: readonly LabelledReview[],
  sorter: Sorter,
  causes: readonly Cause[],
  threshold: number,
  inParallel = 4,
): Promise<EvalReport> {
  const causeIds = causes.map((cause) => cause.id)
  const perCause: EvalReport["perCause"] = Object.fromEntries(
    causeIds.map((id) => [id, { total: 0, right: 0 }]),
  )
  const mistakes: EvalReport["mistakes"] = []
  let right = 0
  let needsPerson = 0
  let failed = 0
  let sorted = 0
  let languageRight = 0
  let moneyRight = 0
  // The model calls run a few at a time; the tallying below is in order.
  const answers = await inPool(set, inParallel, async ({ review }) => {
    try {
      return await sorter.sort(sortInput(review), causes)
    } catch {
      return null
    }
  })
  for (const [index, { review, expected }] of set.entries()) {
    const tally = (perCause[expected.cause] ??= { total: 0, right: 0 })
    tally.total += 1
    const raw = answers[index]
    if (raw === null || raw === undefined) {
      failed += 1
      mistakes.push({ id: review.storeReviewId, expected: expected.cause, got: "(no answer)" })
      continue
    }
    const outcome = parseLabel(raw, causeIds, threshold)
    if (outcome.kind === "needs_person") {
      needsPerson += 1
      mistakes.push({ id: review.storeReviewId, expected: expected.cause, got: "(needs a person)" })
      continue
    }
    sorted += 1
    if (outcome.label.language === expected.language) languageRight += 1
    if (outcome.label.moneyInvolved === expected.moneyInvolved) moneyRight += 1
    if (outcome.label.cause === expected.cause) {
      right += 1
      tally.right += 1
    } else {
      mistakes.push({ id: review.storeReviewId, expected: expected.cause, got: outcome.label.cause })
    }
  }
  const share = (count: number, of: number) => (of === 0 ? 0 : count / of)
  return {
    total: set.length,
    accuracy: share(right, set.length),
    needsPerson: share(needsPerson, set.length),
    languageAccuracy: share(languageRight, sorted),
    moneyAccuracy: share(moneyRight, sorted),
    perCause,
    mistakes,
    failed,
  }
}

const percent = (share: number) => `${(share * 100).toFixed(1)}%`

/** The report as the `eval` command prints it. */
export function formatReport(report: EvalReport): string {
  const lines = [
    `Right cause: ${percent(report.accuracy)} of ${String(report.total)} reviews`,
    `Sent to a person: ${percent(report.needsPerson)}`,
    `Right language: ${percent(report.languageAccuracy)}; right money flag: ${percent(report.moneyAccuracy)}`,
    ...(report.failed > 0 ? [`No answer: ${String(report.failed)}`] : []),
    "",
    "By cause:",
    ...Object.entries(report.perCause).map(
      ([cause, { total, right }]) => `  ${cause.padEnd(20)} ${String(right)}/${String(total)}`,
    ),
  ]
  return lines.join("\n")
}
