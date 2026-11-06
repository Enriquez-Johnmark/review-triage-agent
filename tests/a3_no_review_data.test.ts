import { describe, expect, it } from "vitest"

import { findReviewData } from "../src/core/review-data.ts"

describe("A3", () => {
  it("a3_review_data_outside_the_sample_is_found", () => {
    const found = findReviewData([
      { path: "samples/reviews.json", content: '[{"storeReviewId":"s-1"}]' },
      { path: "tests/fixtures/play.json", content: '{"userName":"Made Up"}' },
      { path: "exports/play.json", content: '{"rows":[{"storeReviewId":"gp-1"}]}' },
      { path: "notes/apple.json", content: '{"feed":{"entry":[{"im:rating":{"label":"1"}}]}}' },
      { path: "data/reviews.db", content: "" },
      { path: "backup.sqlite", content: "" },
      { path: "package.json", content: '{"name":"review-triage-agent"}' },
      { path: "src/core/review.ts", content: "storeReviewId: z.string()" },
    ])

    expect(found).toEqual(["exports/play.json", "notes/apple.json", "data/reviews.db", "backup.sqlite"])
  })

  it("a3_the_real_data_folder_is_ignored_by_git", async () => {
    const { readFile } = await import("node:fs/promises")
    const ignored = await readFile(new URL("../.gitignore", import.meta.url), "utf8")

    expect(ignored.split("\n")).toContain("data/")
  })
})
