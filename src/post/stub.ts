import type { Clock } from "../clock.ts"
import type { Db } from "../store/db.ts"
import type { PostRequest, Poster } from "./poster.ts"

/** The stand-in for Google's Reply to Reviews API: it records what would
 *  have been posted, once per key (E5). */
export class StubPoster implements Poster {
  readonly name = "stub"
  constructor(
    private readonly db: Db,
    private readonly clock: Clock,
  ) {}

  accepts(): boolean {
    return true
  }

  post(request: PostRequest): Promise<void> {
    this.db
      .prepare(
        `insert into stub_posts (key, app_id, store, store_review_id, text, at)
         values (@key, @appId, @store, @storeReviewId, @text, @at) on conflict (key) do nothing`,
      )
      .run({ ...request, at: this.clock.now().toISOString() })
    return Promise.resolve()
  }
}

/** What the stand-in has posted, oldest first. */
export function stubPosts(db: Db): { key: string; storeReviewId: string; text: string }[] {
  return db
    .prepare("select key, store_review_id as storeReviewId, text from stub_posts order by at, key")
    .all() as { key: string; storeReviewId: string; text: string }[]
}
