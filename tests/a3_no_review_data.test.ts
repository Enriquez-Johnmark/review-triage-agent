import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

import { findReviewData } from "../src/core/review-data.ts"
import { mixedFiles, pastedFiles } from "./fixtures/review-data-files.ts"

describe("A3", () => {
  it("a3_review_data_outside_the_sample_is_found", () => {
    expect(findReviewData(mixedFiles)).toEqual([
      "exports/play.json",
      "notes/apple.json",
      "data/reviews.db",
      "backup.sqlite",
    ])
  })

  it("a3_reviews_pasted_into_any_kind_of_file_are_found", () => {
    expect(findReviewData(pastedFiles)).toEqual([
      "notes/reviews.md",
      "src/debug.ts",
      "tests/fixtures/real.ts",
    ])
  })

  it("a3_the_real_data_folder_is_ignored_by_git", async () => {
    const ignored = await readFile(new URL("../.gitignore", import.meta.url), "utf8")

    expect(ignored.split("\n")).toContain("data/")
  })
})
