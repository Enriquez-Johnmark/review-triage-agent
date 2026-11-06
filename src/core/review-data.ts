/** A file in the repository, as the A3 check sees it. */
export interface RepoFile {
  path: string
  content: string
}

/** Where made-up reviews may live. */
const ALLOWED = ["samples/", "tests/fixtures/"]
/** Files that are only ever data. */
const DATA_FILE = /\.(json|jsonl|ndjson|csv|tsv|db|sqlite|sqlite3)$/i
/** Signs a file holds store reviews: our own fields, or the stores' own. */
const REVIEW_MARKERS = [/"storeReviewId"/, /"store_review_id"/, /"im:rating"/, /"userName"/, /"reviewId"/]

/** The files that look like review data outside the made-up sample (A3).
 *  Real reviews belong in the ignored `data/` folder, never in git. */
export function findReviewData(files: readonly RepoFile[]): string[] {
  return files
    .filter(({ path }) => !ALLOWED.some((prefix) => path.startsWith(prefix)))
    .filter(
      ({ path, content }) =>
        path.startsWith("data/") ||
        /\.(db|sqlite|sqlite3)$/i.test(path) ||
        (DATA_FILE.test(path) && REVIEW_MARKERS.some((marker) => marker.test(content))),
    )
    .map(({ path }) => path)
}
