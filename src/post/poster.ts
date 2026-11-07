import type { Store } from "../core/review.ts"

/** One approved reply to post. */
export interface PostRequest {
  /** Recorded before the call; the same key posts the same reply at most once. */
  key: string
  appId: string
  store: Store
  storeReviewId: string
  text: string
}

/** Posts replies. Called only by `postReply`, which checks the approval
 *  first (E1). Posting again with the same key must not post twice. */
export interface Poster {
  readonly name: string
  post(request: PostRequest): Promise<void>
}
