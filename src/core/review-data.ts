/** A file in the repository, as the A3 check sees it. */
export interface RepoFile {
  path: string
  content: string
}

/** Database files, which are only ever data. */
const DATABASE = /\.(db|sqlite|sqlite3)$/i
/** Files that hold nothing but data. */
const DATA_FILE = /\.(json|jsonl|ndjson|csv|tsv)$/i
/** Field names that only review records carry: ours, and the stores' own. */
const REVIEW_FIELD = /storeReviewId|store_review_id|userName|reviewId|im:rating/
/** A review field written as data (`"userName": …`), not as code. */
const REVIEW_RECORD = /"(?:storeReviewId|store_review_id|userName|reviewId|im:rating)"\s*:/g
/** More of these in one file than code ever needs means a dump of reviews. */
const RECORDS_IN_A_DUMP = 3
/** Test fixtures must say they are made up. */
const MADE_UP = /made[- ]up|invented/i

/** The files that look like real review data (A3). Real reviews belong in
 *  the ignored `data/` folder; only the reviewed sample in `samples/`, and
 *  fixtures that say they're made up, may hold review records. */
export function findReviewData(files: readonly RepoFile[]): string[] {
  return files
    .filter(({ path, content }) => {
      if (path.startsWith("data/") || DATABASE.test(path)) return true
      if (path.startsWith("samples/")) return false
      if (path.startsWith("tests/fixtures/")) return !MADE_UP.test(content)
      if (DATA_FILE.test(path)) return REVIEW_FIELD.test(content)
      return (content.match(REVIEW_RECORD)?.length ?? 0) >= RECORDS_IN_A_DUMP
    })
    .map(({ path }) => path)
}
