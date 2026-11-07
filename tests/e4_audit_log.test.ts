import { describe, expect, it } from "vitest"

import { draftReply } from "../src/commands/draft.ts"
import { postReply } from "../src/commands/post.ts"
import { approveReply, refuseReply, writeReply } from "../src/commands/replies.ts"
import { withSupport } from "../src/core/reply-rules.ts"
import { StubPoster } from "../src/post/stub.ts"
import { auditLog } from "../src/store/audit.ts"
import { FakeDrafter, GOOD, KEY, settings, SUPPORT, world } from "./fixtures/replies.ts"

describe("E4", () => {
  it("e4_every_draft_edit_approval_refusal_and_post_is_logged_with_when_and_who", async () => {
    const { db, clock } = world()
    const draft = await draftReply(db, clock, new FakeDrafter([GOOD]), settings, KEY)
    clock.advanceDays(1)
    refuseReply(db, clock, draft.id, "ben", "too short")
    writeReply(db, clock, KEY, withSupport(`${GOOD} Thank you for telling us.`, SUPPORT), "ana", settings)
    approveReply(db, clock, draft.id, "ben", settings)
    clock.advanceDays(1)
    await postReply(db, clock, new StubPoster(db, clock), draft.id, "ben")

    const subject = `draft:${String(draft.id)}`
    expect(auditLog(db).map(({ at, actor, action, subject: of }) => ({ at, actor, action, of }))).toEqual([
      { at: "2026-11-04T02:00:00.000Z", actor: "model", action: "reply.drafted", of: subject },
      { at: "2026-11-05T02:00:00.000Z", actor: "ben", action: "reply.refused", of: subject },
      { at: "2026-11-05T02:00:00.000Z", actor: "ana", action: "reply.edited", of: subject },
      { at: "2026-11-05T02:00:00.000Z", actor: "ben", action: "reply.approved", of: subject },
      { at: "2026-11-06T02:00:00.000Z", actor: "ben", action: "reply.posted", of: subject },
    ])
  })

  it("e4_the_log_cant_be_changed_or_emptied", async () => {
    const { db, clock } = world()
    await draftReply(db, clock, new FakeDrafter([GOOD]), settings, KEY)
    expect(() => db.prepare("update audit_log set actor = 'someone'").run()).toThrow("append-only")
    expect(() => db.prepare("delete from audit_log").run()).toThrow("append-only")
  })
})
