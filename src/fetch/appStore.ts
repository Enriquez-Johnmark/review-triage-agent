import { z } from "zod"

import { Review } from "../core/review.ts"

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
  const title = entry.title?.label.trim()
  const body = entry.content.label.trim()
  return Review.parse({
    store: "app_store",
    storeReviewId: entry.id.label,
    appId,
    at: new Date(entry.updated.label).toISOString(),
    stars: Number(entry["im:rating"].label),
    text: title ? `${title}\n\n${body}` : body,
    appVersion: entry["im:version"]?.label ?? null,
    // Apple's public feed carries no developer replies: unknown, not unanswered.
    companyReplied: null,
  })
}

/** The reviews in one page of Apple's feed. The feed's first entry is the app
 *  itself on some pages; anything that isn't a review is skipped. */
export function parseFeedPage(body: unknown, appId: string): Review[] {
  const entries = Feed.parse(body).feed.entry
  const list = Array.isArray(entries) ? entries : entries ? [entries] : []
  return list.flatMap((item) => {
    const entry = FeedEntry.safeParse(item)
    return entry.success ? [fromAppStore(entry.data, appId)] : []
  })
}

/** The most recent reviews Apple's feed offers for `appId` (up to 10 pages). */
export async function fetchAppStore(appId: string, pages = 10): Promise<Review[]> {
  const reviews: Review[] = []
  for (let page = 1; page <= pages; page++) {
    const url = `https://itunes.apple.com/ph/rss/customerreviews/page=${String(page)}/id=${appId}/sortby=mostrecent/json`
    const response = await fetch(url)
    if (!response.ok) break
    const found = parseFeedPage(await response.json(), appId)
    if (found.length === 0) break
    reviews.push(...found)
  }
  return reviews
}
