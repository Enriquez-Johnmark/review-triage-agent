import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"

import { z } from "zod"

import type { Cause } from "../core/causes.ts"
import type { SortInput, Sorter } from "./sorter.ts"

/** Saved model answers, keyed by what the model was asked. */
const Recordings = z.object({ model: z.string(), answers: z.record(z.string(), z.string()) })
type Recordings = z.infer<typeof Recordings>

/** The same question always gives the same key: the review and the causes. */
export function recordingKey(input: SortInput, causes: readonly Cause[]): string {
  const question = JSON.stringify({ input, causes: causes.map((cause) => [cause.id, cause.description]) })
  return createHash("sha256").update(question).digest("hex").slice(0, 16)
}

export function loadRecordings(file: string): Recordings | undefined {
  return existsSync(file) ? Recordings.parse(JSON.parse(readFileSync(file, "utf8"))) : undefined
}

/** Replays recorded answers, so tests and CI run without an API key. A
 *  question never recorded is an error, like a failed call. */
export class RecordedSorter implements Sorter {
  readonly model: string
  constructor(private readonly recordings: Recordings) {
    this.model = recordings.model
  }
  sort(input: SortInput, causes: readonly Cause[]): Promise<string> {
    const answer = this.recordings.answers[recordingKey(input, causes)]
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
    this.recordings = loadRecordings(file) ?? { model: live.model, answers: {} }
    this.recordings.model = live.model
  }
  async sort(input: SortInput, causes: readonly Cause[]): Promise<string> {
    const answer = await this.live.sort(input, causes)
    this.recordings.answers[recordingKey(input, causes)] = answer
    writeFileSync(this.file, `${JSON.stringify(this.recordings, null, 2)}\n`)
    return answer
  }
}
