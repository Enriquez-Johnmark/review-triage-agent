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

/** The newest `count` reviews of `appId` in the Philippines. */
export async function fetchGooglePlay(appId: string, count = 200): Promise<Review[]> {
  const options: Record<string, unknown> = {
    appId,
    lang: "en",
    country: "ph",
    // gplay.sort.NEWEST is 2; the package's own types mistype `sort`, so the
    // documented value is passed directly.
    sort: NEWEST,
    num: count,
    paginate: true,
  }
  const { data } = await gplay.reviews(options as unknown as Parameters<typeof gplay.reviews>[0])
  return (data as GooglePlayReview[]).map((raw) => fromGooglePlay(raw, appId))
}
