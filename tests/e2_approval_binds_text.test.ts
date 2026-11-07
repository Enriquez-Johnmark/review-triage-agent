import { describe, expect, it } from "vitest"

import { draftReply } from "../src/commands/draft.ts"
import { approveReply, refuseReply, writeReply } from "../src/commands/replies.ts"
import { fingerprint } from "../src/core/fingerprint.ts"
import { withSupport } from "../src/core/reply-rules.ts"
import { auditLog } from "../src/store/audit.ts"
import { FakeDrafter, GOOD, KEY, PROMISE, settings, SUPPORT, world } from "./fixtures/replies.ts"

async function drafted() {
  const w = world()
  const draft = await draftReply(w.db, w.clock, new FakeDrafter([GOOD]), settings, KEY)
  return { ...w, draft }
}

describe("E2", () => {
  it("e2_an_approval_records_the_fingerprint_of_the_exact_text", async () => {
    const { db, clock, draft } = await drafted()

    const approved = approveReply(db, clock, draft.id, "ana", settings)

    expect(approved).toMatchObject({ status: "approved", approvedBy: "ana" })
    expect(approved.approvedFingerprint).toBe(fingerprint(draft.text))
  })

  it("e2_editing_an_approved_reply_cancels_the_approval", async () => {
    const { db, clock, draft } = await drafted()
    approveReply(db, clock, draft.id, "ana", settings)

    const edited = writeReply(db, clock, KEY, withSupport(`${GOOD} Thank you!`, SUPPORT), "ben", settings)

    expect(edited).toMatchObject({ status: "ready", approvedFingerprint: null, writtenBy: "ben" })
    expect(auditLog(db).at(-1)).toMatchObject({
      actor: "ben",
      action: "reply.edited",
      details: { approvalCancelled: true },
    })
  })

  it("e2_a_reply_that_breaks_a_rule_cant_be_approved", async () => {
    const { db, clock, draft } = await drafted()
    writeReply(db, clock, KEY, withSupport(PROMISE, SUPPORT), "ben", settings)

    expect(() => approveReply(db, clock, draft.id, "ana", settings)).toThrow("flagged, not ready to approve")
  })

  it("e2_only_a_person_by_name_approves", async () => {
    const { db, clock, draft } = await drafted()
    expect(() => approveReply(db, clock, draft.id, "model", settings)).toThrow("only a person")
    expect(() => approveReply(db, clock, draft.id, " ", settings)).toThrow("only a person")
  })

  it("e2_a_refused_reply_loses_its_approval", async () => {
    const { db, clock, draft } = await drafted()
    approveReply(db, clock, draft.id, "ana", settings)

    expect(refuseReply(db, clock, draft.id, "ben", "too formal")).toMatchObject({
      status: "refused",
      approvedFingerprint: null,
    })
  })

  it("e2_a_person_can_write_a_reply_when_the_model_couldnt", async () => {
    const { db, clock } = world()
    await draftReply(db, clock, new FakeDrafter([PROMISE]), settings, KEY)

    const written = writeReply(db, clock, KEY, withSupport(GOOD, SUPPORT), "ana", settings)
    expect(approveReply(db, clock, written.id, "ben", settings).status).toBe("approved")
  })
})
