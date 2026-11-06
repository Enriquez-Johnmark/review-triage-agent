// Made-up store answers, shaped like what Google Play and Apple return.
// Every name and review here is invented.

import type { GooglePlayReview } from "../../src/fetch/googlePlay.ts"

export const PLAY_APP = "com.example.wallet"
export const APPLE_APP = "123456789"

export const playReviews: GooglePlayReview[] = [
  {
    id: "gp-1",
    userName: "Juana Makatarungan",
    userImage: "https://example.test/juana.png",
    date: "2026-10-30T08:15:00.000Z",
    score: 1,
    text: "Ayaw mag open ng app after update. Pls fix",
    version: "4.2.0",
    replyText: null,
  },
  {
    id: "gp-2",
    userName: "Pedro Kalayaan",
    userImage: "https://example.test/pedro.png",
    date: "2026-10-31T02:00:00.000Z",
    score: 2,
    text: "Money was deducted but the transfer failed. No refund yet.",
    version: "4.2.0",
    replyText: "Sorry for the trouble. Please message our support in the app.",
  },
  {
    id: "gp-3",
    userName: "Liza Bituin",
    date: "2026-11-01T11:30:00.000Z",
    score: 5,
    text: "Fast and easy padala. Salamat!",
    version: null,
    replyText: null,
  },
]

/** One page of Apple's feed: the first entry is the app itself. */
export const applePage = {
  feed: {
    entry: [
      { "im:name": { label: "Example Wallet" }, id: { label: "https://apps.apple.com/app/id123456789" } },
      {
        author: { name: { label: "Mario Dimaguiba" } },
        updated: { label: "2026-10-29T20:34:03-07:00" },
        "im:rating": { label: "1" },
        "im:version": { label: "4.1.9" },
        id: { label: "as-1" },
        title: { label: "Cash out takes days" },
        content: { label: "Cash out to my bank took 3 days and they charged a fee." },
      },
    ],
  },
}
