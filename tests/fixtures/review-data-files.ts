// Made-up repository files for the A3 check: none holds a real review.

import type { RepoFile } from "../../src/core/review-data.ts"

export const mixedFiles: RepoFile[] = [
  { path: "samples/reviews.json", content: '[{"storeReviewId":"s-1"}]' },
  { path: "tests/fixtures/play.json", content: '// made-up\n{"userName":"Made Up"}' },
  { path: "exports/play.json", content: '{"rows":[{"storeReviewId":"gp-1"}]}' },
  { path: "notes/apple.json", content: '{"feed":{"entry":[{"im:rating":{"label":"1"}}]}}' },
  { path: "data/reviews.db", content: "" },
  { path: "backup.sqlite", content: "" },
  { path: "package.json", content: '{"name":"review-triage-agent"}' },
  { path: "src/core/review.ts", content: "storeReviewId: z.string()" },
]

const dump = (key: string) => [1, 2, 3].map((n) => `{"${key}": "r-${String(n)}", "text": "..."}`).join("\n")

export const pastedFiles: RepoFile[] = [
  { path: "notes/reviews.md", content: dump("storeReviewId") },
  { path: "src/debug.ts", content: `const rows = [\n${dump("userName")}\n]` },
  { path: "tests/fixtures/real.ts", content: "export const rows = [{ id: 'gp-9' }]" },
  { path: "tests/fixtures/made.ts", content: "// Made-up store answers\nexport const rows = []" },
  { path: "src/core/review.ts", content: 'storeReviewId: z.string() // "storeReviewId": once' },
]
