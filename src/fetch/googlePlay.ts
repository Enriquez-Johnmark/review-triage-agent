import gplay from "google-play-scraper"

import { Review } from "../core/review.ts"

/** What google-play-scraper returns for one review (the fields we read). */
export interface GooglePlayReview {
  id: string
  userName?: string
  userImage?: string
  date: string
  score: number
  text: string | null
  version: string | null
  replyText: string | null
}

/** One store review as kept: the reviewer's name and picture are dropped here,
 *  before anything else sees them (A1). */
export function fromGooglePlay(raw: GooglePlayReview, appId: string): Review {
  return Review.parse({
    store: "google_play",
    storeReviewId: raw.id,
    appId,
    at: new Date(raw.date).toISOString(),
    stars: raw.score,
    text: raw.text ?? "",
    appVersion: raw.version ?? null,
    companyReplied: Boolean(raw.replyText),
  })
}

const NEWEST = 2

/** One page of Google Play reviews, and the token for the next one. */
export interface GooglePlayPage {
  data: GooglePlayReview[]
  nextPaginationToken: string | null | undefined
}

/** Asks Google Play for the page after `token` (the first page without one). */
export type PageRequest = (token: string | undefined) => Promise<GooglePlayPage>

function requestFrom(appId: string): PageRequest {
  return async (token) => {
    const options: Record<string, unknown> = {
      appId,
      lang: "en",
      country: "ph",
      // gplay.sort.NEWEST is 2; the package's own types mistype `sort`, so the
      // documented value is passed directly.
      sort: NEWEST,
      num: 150,
      paginate: true,
      nextPaginationToken: token,
    }
    const page = await gplay.reviews(options as unknown as Parameters<typeof gplay.reviews>[0])
    return page as unknown as GooglePlayPage
  }
}

/** The newest `count` reviews of `appId` in the Philippines, page by page. */
export async function fetchGooglePlay(
  appId: string,
  count = 200,
  request: PageRequest = requestFrom(appId),
): Promise<Review[]> {
  const found: GooglePlayReview[] = []
  let token: string | undefined
  do {
    const page = await request(token)
    found.push(...page.data)
    token = page.nextPaginationToken ?? undefined
  } while (token && found.length < count)
  return found.slice(0, count).map((raw) => fromGooglePlay(raw, appId))
}
