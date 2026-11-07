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
  /** Whether it can post replies to this store at all; asked before a post's
   *  key is recorded, so a post that can never succeed doesn't lock the reply. */
  accepts(store: Store): boolean
  post(request: PostRequest): Promise<void>
}
