import { z } from "zod"

import { Review } from "../core/review.ts"
import { convertEach, type Fetched } from "./fetched.ts"

/** One entry of Apple's public customer-review feed (the fields we read). */
const FeedEntry = z.object({
  id: z.object({ label: z.string() }),
  author: z.object({ name: z.object({ label: z.string() }) }).optional(),
  updated: z.object({ label: z.string() }),
  "im:rating": z.object({ label: z.string() }),
  "im:version": z.object({ label: z.string() }).optional(),
  title: z.object({ label: z.string() }).optional(),
  content: z.object({ label: z.string() }),
})
type FeedEntry = z.infer<typeof FeedEntry>

const Feed = z.object({
  feed: z.object({ entry: z.union([z.array(z.unknown()), z.unknown()]).optional() }),
})

/** One feed entry as kept: the author's name is dropped here (A1). Apple puts a
 *  title above each review; it is part of what the reviewer wrote. */
export function fromAppStore(entry: FeedEntry, appId: string): Review {
  const at = new Date(entry.updated.label)
  if (Number.isNaN(at.getTime())) throw new Error(`review ${entry.id.label} has no valid date`)
  const title = entry.title?.label.trim()
  const body = entry.content.label.trim()
  return Review.parse({
    store: "app_store",
    storeReviewId: entry.id.label,
    appId,
    at: at.toISOString(),
    stars: Number(entry["im:rating"].label),
    text: title ? `${title}\n\n${body}` : body,
    appVersion: entry["im:version"]?.label ?? null,
    // Apple's public feed carries no developer replies: unknown, not unanswered.
    companyReplied: null,
  })
}

/** The reviews in one page of Apple's feed. The feed's first entry is the app
 *  itself on some pages: it isn't a review, and isn't counted as skipped. */
export function parseFeedPage(body: unknown, appId: string): Fetched {
  const entries = Feed.parse(body).feed.entry
  const list = Array.isArray(entries) ? entries : entries ? [entries] : []
  const reviews = list.filter((item) => typeof item === "object" && item !== null && "im:rating" in item)
  return convertEach(reviews, (item) => fromAppStore(FeedEntry.parse(item), appId))
}

/** The most recent reviews Apple's feed offers for `appId` (up to 10 pages). */
export async function fetchAppStore(
  appId: string,
  pages = 10,
  get: (url: string) => Promise<Response> = (url) => fetch(url),
): Promise<Fetched> {
  const all: Fetched = { reviews: [], skipped: 0 }
  for (let page = 1; page <= pages; page++) {
    const url = `https://itunes.apple.com/ph/rss/customerreviews/page=${String(page)}/id=${appId}/sortby=mostrecent/json`
    const response = await get(url)
    // A failed request is an error, never "no more reviews".
    if (!response.ok)
      throw new Error(`the App Store answered ${String(response.status)} for page ${String(page)}`)
    const found = parseFeedPage(await response.json(), appId)
    if (found.reviews.length === 0 && found.skipped === 0) break
    all.reviews.push(...found.reviews)
    all.skipped += found.skipped
  }
  return all
}
