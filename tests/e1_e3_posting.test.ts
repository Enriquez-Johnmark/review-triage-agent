import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { draftReply } from "../src/commands/draft.ts"
import { postReply } from "../src/commands/post.ts"
import { approveReply, writeReply } from "../src/commands/replies.ts"
import { withSupport } from "../src/core/reply-rules.ts"
import type { PostRequest, Poster } from "../src/post/poster.ts"
import { StubPoster, stubPosts } from "../src/post/stub.ts"
import { draftById } from "../src/store/drafts.ts"
import { FakeDrafter, GOOD, KEY, settings, SUPPORT, world } from "./fixtures/replies.ts"

async function approved() {
  const w = world()
  const draft = await draftReply(w.db, w.clock, new FakeDrafter([GOOD]), settings, KEY)
  approveReply(w.db, w.clock, draft.id, "ana", settings)
  return { ...w, draft, stub: new StubPoster(w.db, w.clock) }
}

/** Posts through the stand-in, then crashes before its caller hears back. */
class CrashAfterPosting implements Poster {
  readonly name = "stub"
  calls: PostRequest[] = []
  constructor(private readonly inner: Poster) {}
  async post(request: PostRequest): Promise<void> {
    this.calls.push(request)
    await this.inner.post(request)
    if (this.calls.length === 1) throw new Error("crash")
  }
}

describe("E1", () => {
  it("e1_a_reply_nobody_approved_is_never_posted", async () => {
    const { db, clock } = world()
    const draft = await draftReply(db, clock, new FakeDrafter([GOOD]), settings, KEY)
    const stub = new StubPoster(db, clock)

    await expect(postReply(db, clock, stub, draft.id, "ana")).rejects.toThrow("isn't approved")
    expect(stubPosts(db)).toEqual([])
  })

  it("e1_only_the_post_command_calls_a_poster", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
      )
    const callers = files("src").filter((file) => /\.post\(/.test(readFileSync(file, "utf8")))
    expect(callers).toEqual([join("src", "commands", "post.ts")])
  })
})

describe("E2, when posting", () => {
  it("e2_posting_checks_the_text_still_matches_what_was_approved", async () => {
    const { db, clock, draft, stub } = await approved()
    // Changed behind the app's back, without going through an edit.
    db.prepare("update drafts set text = ? where id = ?").run(
      withSupport("Something else.", SUPPORT),
      draft.id,
    )

    await expect(postReply(db, clock, stub, draft.id, "ana")).rejects.toThrow("changed after it was approved")
    expect(stubPosts(db)).toEqual([])
  })
})

describe("E3", () => {
  it("e3_posting_the_same_approved_reply_twice_posts_it_once", async () => {
    const { db, clock, draft, stub } = await approved()

    const first = await postReply(db, clock, stub, draft.id, "ana")
    const again = await postReply(db, clock, stub, draft.id, "ana")

    expect(first.kind).toBe("posted")
    expect(again).toEqual({ kind: "already_posted", key: first.key })
    expect(stubPosts(db)).toEqual([{ key: first.key, storeReviewId: KEY.storeReviewId, text: draft.text }])
    expect(draftById(db, draft.id)?.status).toBe("posted")
  })

  it("e3_a_post_cut_off_by_a_crash_is_finished_with_the_same_key_and_posted_once", async () => {
    const { db, clock, draft, stub } = await approved()
    const crashing = new CrashAfterPosting(stub)

    await expect(postReply(db, clock, crashing, draft.id, "ana")).rejects.toThrow("crash")
    await postReply(db, clock, crashing, draft.id, "ana")

    expect(crashing.calls.map((call) => call.key)).toEqual([crashing.calls[0]?.key, crashing.calls[0]?.key])
    expect(stubPosts(db)).toHaveLength(1)
  })

  it("e3_a_reply_being_posted_cant_be_changed_until_the_post_finishes", async () => {
    const { db, clock, draft, stub } = await approved()
    await expect(postReply(db, clock, new CrashAfterPosting(stub), draft.id, "ana")).rejects.toThrow()

    expect(() => writeReply(db, clock, KEY, withSupport("New text.", SUPPORT), "ben", settings)).toThrow(
      "being posted",
    )
  })
})
