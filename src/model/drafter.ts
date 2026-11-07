/** Everything the model is shown to write a reply: the review's text, stars,
 *  app version and cause; no names, IDs or anything else (D4). The type is
 *  the guarantee. */
export interface DraftInput {
  text: string
  stars: number
  appVersion: string | null
  /** The cause's name, as the app's causes call it. */
  cause: string
}

/** How the reply must be written; none of it comes from the review. */
export interface DraftGuide {
  /** The most characters the body may have: the support channel is added after. */
  maxLength: number
  /** Rules the previous draft broke, when this is the redraft (D3). */
  broke: readonly string[]
}

/** Writes one reply body, returning the model's raw answer for `parseDraft`:
 *  nothing it says is trusted until it is parsed and checked. */
export interface Drafter {
  readonly model: string
  draft(input: DraftInput, guide: DraftGuide): Promise<string>
}
