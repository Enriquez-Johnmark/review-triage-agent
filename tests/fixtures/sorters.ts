// Made-up model answers for tests: stand-ins for Claude.

import type { SortInput, Sorter } from "../../src/model/sorter.ts"

/** Answers with `answer(input)`, remembering every input it was shown. */
export class FakeSorter implements Sorter {
  readonly model = "fake-sorter"
  readonly seen: SortInput[] = []
  constructor(private readonly answer: (input: SortInput) => string) {}
  sort(input: SortInput): Promise<string> {
    this.seen.push(input)
    return Promise.resolve(this.answer(input))
  }
}

/** A confident answer naming `cause`. */
export const confident = (cause: string, money = false) =>
  JSON.stringify({ cause, language: "english", money_involved: money, confidence: 0.95 })
