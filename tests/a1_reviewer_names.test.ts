import { describe, expect, it } from "vitest"

import { FixedClock } from "../src/clock.ts"
import { parseFeedPage } from "../src/fetch/appStore.ts"
import { fromGooglePlay } from "../src/fetch/googlePlay.ts"
import { openDb } from "../src/store/db.ts"
import { saveReviews } from "../src/store/reviews.ts"
import { APPLE_APP, applePage, PLAY_APP, playReviews } from "./fixtures/store-data.ts"

const clock = new FixedClock(new Date("2026-11-02T01:00:00Z"))
const NAMES = ["Juana", "Makatarungan", "Pedro", "Kalayaan", "Liza", "Bituin", "Mario", "Dimaguiba"]

/** Every value in every table, as one string. */
function everything(db: ReturnType<typeof openDb>): string {
  const tables = db.prepare("select name from sqlite_master where type = 'table'").all() as { name: string }[]
  return tables.map(({ name }) => JSON.stringify(db.prepare(`select * from "${name}"`).all())).join("\n")
}

describe("A1", () => {
  it("a1_fetched_reviews_are_stored_without_reviewer_names", () => {
    const db = openDb(":memory:")
    const reviews = [
      ...playReviews.map((raw) => fromGooglePlay(raw, PLAY_APP)),
      ...parseFeedPage(applePage, APPLE_APP),
    ]

    saveReviews(db, clock, reviews)

    const stored = everything(db)
    expect(stored).toContain("Ayaw mag open")
    expect(stored).toContain("Cash out takes days")
    for (const name of NAMES) expect(stored).not.toContain(name)
    expect(stored).not.toContain("example.test")
  })

  it("a1_a_review_with_a_name_field_is_refused_by_its_type", () => {
    const db = openDb(":memory:")
    const [first] = playReviews
    if (!first) throw new Error("the fixture has no reviews")
    const withName = { ...fromGooglePlay(first, PLAY_APP), userName: "Juana" }

    expect(() => saveReviews(db, clock, [withName])).toThrow()
  })
})
