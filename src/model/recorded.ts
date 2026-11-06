import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"

import { z } from "zod"

import type { Cause } from "../core/causes.ts"
import type { SortInput, Sorter } from "./sorter.ts"

/** Saved model answers, keyed by what the model was asked. */
const Recordings = z.object({ model: z.string(), answers: z.record(z.string(), z.string()) })
type Recordings = z.infer<typeof Recordings>

/** The same question always gives the same key; any change to what would be
 *  sent (the model, the instructions, the causes, the review) gives another. */
export function recordingKey(question: unknown): string {
  return createHash("sha256").update(JSON.stringify(question)).digest("hex").slice(0, 16)
}

/** Builds the question a sorter would send for a review. */
export type Question = (input: SortInput, causes: readonly Cause[]) => unknown

export function loadRecordings(file: string): Recordings | undefined {
  return existsSync(file) ? Recordings.parse(JSON.parse(readFileSync(file, "utf8"))) : undefined
}

/** Replays recorded answers, so tests and CI run without an API key. The
 *  key is today's question (`ask`), so answers to an older prompt or another
 *  model aren't replayed: a question never recorded is an error, like a
 *  failed call. */
export class RecordedSorter implements Sorter {
  readonly model: string
  constructor(
    private readonly recordings: Recordings,
    private readonly ask: Question,
  ) {
    this.model = recordings.model
  }
  question(input: SortInput, causes: readonly Cause[]): unknown {
    return this.ask(input, causes)
  }
  sort(input: SortInput, causes: readonly Cause[]): Promise<string> {
    const answer = this.recordings.answers[recordingKey(this.ask(input, causes))]
    return answer === undefined
      ? Promise.reject(new Error("no recorded answer for this review"))
      : Promise.resolve(answer)
  }
}

/** Passes each question to `live` and records its answer in `file`. Only
 *  for the made-up sample: real reviews are never recorded in the repo. */
export class RecordingSorter implements Sorter {
  readonly model: string
  private readonly recordings: Recordings
  constructor(
    private readonly live: Sorter,
    private readonly file: string,
  ) {
    this.model = live.model
    // Answers from another model are dropped, never relabelled as this one's.
    const earlier = loadRecordings(file)
    this.recordings = earlier?.model === live.model ? earlier : { model: live.model, answers: {} }
  }
  question(input: SortInput, causes: readonly Cause[]): unknown {
    return this.live.question(input, causes)
  }
  async sort(input: SortInput, causes: readonly Cause[]): Promise<string> {
    const answer = await this.live.sort(input, causes)
    this.recordings.answers[recordingKey(this.live.question(input, causes))] = answer
    writeFileSync(this.file, `${JSON.stringify(this.recordings, null, 2)}\n`)
    return answer
  }
}
