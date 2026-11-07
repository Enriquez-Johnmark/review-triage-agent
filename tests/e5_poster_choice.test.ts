import { describe, expect, it } from "vitest"

import { FixedClock } from "../src/clock.ts"
import { choosePoster, GooglePlayPoster } from "../src/post/googlePlay.ts"
import type { PostRequest } from "../src/post/poster.ts"
import { StubPoster } from "../src/post/stub.ts"
import { openDb } from "../src/store/db.ts"
import { saveReviews } from "../src/store/reviews.ts"
import { postReply } from "../src/commands/post.ts"
import { approveReply, refuseReply, writeReply } from "../src/commands/replies.ts"
import { withSupport } from "../src/core/reply-rules.ts"
import { GOOD, settings, SUPPORT, world } from "./fixtures/replies.ts"

const db = openDb(":memory:")
const clock = new FixedClock(new Date("2026-11-04T02:00:00Z"))
const request: PostRequest = {
  key: "reply-1-abc",
  appId: "com.example.wallet",
  store: "google_play",
  storeReviewId: "gp:AOqpTOE/1",
  text: "Sorry po! Message us in the app.",
}

describe("E5", () => {
  it("e5_without_the_app_owners_google_credentials_replies_go_to_the_stand_in", () => {
    const never = () => {
      throw new Error("Google must not be reached")
    }
    expect(choosePoster({}, db, clock, never)).toBeInstanceOf(StubPoster)
    expect(choosePoster({ GOOGLE_PLAY_CREDENTIALS: "  " }, db, clock, never)).toBeInstanceOf(StubPoster)
  })

  it("e5_with_credentials_set_replies_go_to_google_play", async () => {
    const sent: { url: string; body: unknown }[] = []
    const poster = choosePoster({ GOOGLE_PLAY_CREDENTIALS: "/keys/play.json" }, db, clock, (keyFile) => {
      expect(keyFile).toBe("/keys/play.json")
      return (url, body) => {
        sent.push({ url, body })
        return Promise.resolve()
      }
    })

    expect(poster).toBeInstanceOf(GooglePlayPoster)
    await poster.post(request)
    expect(sent).toEqual([
      {
        url: "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.example.wallet/reviews/gp%3AAOqpTOE%2F1:reply",
        body: { replyText: request.text },
      },
    ])
  })

  it("e5_an_app_store_reply_refused_by_the_google_poster_stays_free_to_change", async () => {
    const w = world()
    saveReviews(w.db, w.clock, [{ ...w.review, store: "app_store", storeReviewId: "as-1", appId: "123" }])
    const key = { store: "app_store", storeReviewId: "as-1" } as const
    const draft = writeReply(w.db, w.clock, key, withSupport(GOOD, SUPPORT), "ana", settings)
    approveReply(w.db, w.clock, draft.id, "ben", settings)
    const google = new GooglePlayPoster(() => Promise.reject(new Error("must not be called")))

    await expect(postReply(w.db, w.clock, google, draft.id, "ben")).rejects.toThrow("post this one by hand")
    expect(refuseReply(w.db, w.clock, draft.id, "ben", "posted by hand").status).toBe("refused")
  })

  it("e5_app_store_replies_are_never_sent_to_google", async () => {
    const poster = new GooglePlayPoster(() => Promise.reject(new Error("must not be called")))
    await expect(poster.post({ ...request, store: "app_store" })).rejects.toThrow("post this one by hand")
  })
})
