// A3: fails if any committed file looks like review data outside the
// made-up sample. Run in CI on every push: `pnpm check:data`.

import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

import { findReviewData } from "../src/core/review-data.ts"

const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean)
// Every committed file is read as text; binary files simply hold no records.
const found = findReviewData(paths.map((path) => ({ path, content: readFileSync(path, "utf8") })))
if (found.length > 0) {
  console.error(`Review data must not be committed (keep it in data/):\n${found.join("\n")}`)
  process.exit(1)
}
console.log(`No review data among ${String(paths.length)} committed files.`)
