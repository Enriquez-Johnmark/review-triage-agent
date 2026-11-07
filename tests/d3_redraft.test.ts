import { describe, expect, it } from "vitest"

import { draftReply, draftWaiting } from "../src/commands/draft.ts"
import { auditLog } from "../src/store/audit.ts"
import { listDrafts } from "../src/store/drafts.ts"
import { FakeDrafter, GOOD, KEY, PROMISE, settings, SUPPORT, world } from "./fixtures/replies.ts"

describe("D3", () => {
  it("d3_a_draft_that_keeps_the_rules_is_ready_for_a_person_after_one_try", async () => {
    const { db, clock } = world()
    const drafter = new FakeDrafter([GOOD])

    const draft = await draftReply(db, clock, drafter, settings, KEY)

    expect(drafter.seen).toHaveLength(1)
    expect(draft).toMatchObject({ status: "ready", text: `${GOOD}\n${SUPPORT}`, broken: [] })
  })

  it("d3_a_draft_that_breaks_a_rule_is_redrafted_once_told_which_rule", async () => {
    const { db, clock } = world()
    const drafter = new FakeDrafter([PROMISE, GOOD])

    const draft = await draftReply(db, clock, drafter, settings, KEY)

    expect(drafter.seen.map((call) => call.guide.broke)).toEqual([[], ["promise"]])
    expect(draft.status).toBe("ready")
  })

  it("d3_a_draft_that_breaks_a_rule_again_is_flagged_for_a_person", async () => {
    const { db, clock } = world()
    const drafter = new FakeDrafter([PROMISE, PROMISE, GOOD])

    const draft = await draftReply(db, clock, drafter, settings, KEY)

    expect(drafter.seen).toHaveLength(2)
    expect(draft.status).toBe("flagged")
    expect(draft.broken.map((rule) => rule.rule)).toEqual(["promise"])
    expect(auditLog(db).map((entry) => [entry.actor, entry.action, entry.details?.status])).toEqual([
      ["model", "reply.drafted", "flagged"],
    ])
  })

  it("d3_an_unreadable_answer_counts_as_a_broken_draft", async () => {
    const { db, clock } = world()
    const drafter = new FakeDrafter([])
    drafter.draft = () => Promise.resolve("not json")

    const draft = await draftReply(db, clock, drafter, settings, KEY)

    expect(draft.status).toBe("flagged")
    expect(draft.broken.map((rule) => rule.rule)).toContain("empty")
  })

  it("d3_the_body_is_kept_short_enough_for_the_support_channel", async () => {
    const { db, clock } = world()
    const drafter = new FakeDrafter([GOOD])
    await draftReply(db, clock, drafter, settings, KEY)
    expect(drafter.seen[0]?.guide.maxLength).toBe(350 - SUPPORT.length - 1)
  })
})

describe("D4", () => {
  it("d4_drafting_shows_the_model_only_the_text_stars_version_and_cause", async () => {
    const { db, clock, review } = world()
    const drafter = new FakeDrafter([GOOD])

    await draftReply(db, clock, drafter, settings, KEY)

    expect(drafter.seen[0]?.input).toStrictEqual({
      text: review.text,
      stars: 1,
      appVersion: "4.2.0",
      cause: "Crash or won't open",
    })
  })
})

describe("drafting the queue", () => {
  it("drafts each sorted review waiting for a reply once, and lists the drafts", async () => {
    const { db, clock } = world()
    const drafter = new FakeDrafter([GOOD])

    expect(await draftWaiting(db, clock, drafter, settings, ["com.example.wallet"], 10)).toEqual({
      ready: 1,
      flagged: 0,
      failed: 0,
    })
    expect(await draftWaiting(db, clock, drafter, settings, ["com.example.wallet"], 10)).toEqual({
      ready: 0,
      flagged: 0,
      failed: 0,
    })
    expect(listDrafts(db, ["com.example.wallet"]).map((draft) => draft.review)).toEqual([KEY])
  })

  it("a failed model call drafts nothing and is tried again next run", async () => {
    const { db, clock } = world()
    const failing = new FakeDrafter([])
    failing.draft = () => Promise.reject(new Error("overloaded"))

    expect(await draftWaiting(db, clock, failing, settings, ["com.example.wallet"], 10)).toMatchObject({
      failed: 1,
    })
    expect(listDrafts(db, ["com.example.wallet"])).toEqual([])
  })
})
