import type { Cause } from "../core/causes.ts"

/** Everything the model is shown about a review: no names, no IDs, nothing
 *  else (D4). The type is the guarantee. */
export interface SortInput {
  text: string
  stars: number
  appVersion: string | null
}

/** Sorts one review, returning the model's raw answer for `parseLabel` to
 *  check: nothing the model says is trusted until it is parsed. */
export interface Sorter {
  /** Which model answered, kept with each label. */
  readonly model: string
  sort(input: SortInput, causes: readonly Cause[]): Promise<string>
}
