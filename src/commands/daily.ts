import type { Clock } from "../clock.ts"
import type { Cause } from "../core/causes.ts"
import { type VersionSpike, type WeeklySpike } from "../core/spikes.ts"
import type { Db } from "../store/db.ts"
import { listDrafts } from "../store/drafts.ts"
import { replyQueue } from "../store/queue.ts"
import { summaryRows } from "../store/summary.ts"
import { summariseRows } from "./summary.ts"

const DAY = 86_400_000

/** One money complaint still waiting for a posted reply. */
export interface MoneyWaiting {
  store: string
  storeReviewId: string
  stars: number
  cause: string | null
  /** The start of the review's text, for the email. */
  excerpt: string
}

/** The morning email's five parts (spec, Round 2; F4). */
export interface DailySummary {
  /** Reviews fetched in the last 24 hours. */
  newReviews: number
  /** This week's share answered; `null` when the stores don't say. */
  shareAnswered: number | null
  /** This week's three most common causes. */
  topCauses: { cause: string; label: string; count: number }[]
  /** This week's spikes, and the latest version's crash spike if it has one. */
  spikes: { weekly: WeeklySpike[]; versions: VersionSpike[] }
  /** Money complaints with no posted reply: how many, and the newest five. */
  moneyWaiting: { count: number; newest: MoneyWaiting[] }
}

/** The daily summary for an app (`appIds`: its store IDs). */
export function dailySummary(
  db: Db,
  clock: Clock,
  appIds: readonly string[],
  causes: readonly Cause[],
): DailySummary {
  const now = clock.now()
  const rows = summaryRows(db, appIds)
  const { overview, weeklySpikes, versionSpikes } = summariseRows(rows, now, causes)
  const newReviews = (
    db
      .prepare(
        `select count(*) as count from reviews
         where app_id in (select value from json_each(?)) and fetched_at >= ?`,
      )
      .get(JSON.stringify(appIds), new Date(now.getTime() - DAY).toISOString()) as { count: number }
  ).count
  const posted = new Set(
    listDrafts(db, appIds)
      .filter((draft) => draft.status === "posted")
      .map((draft) => `${draft.review.store}:${draft.review.storeReviewId}`),
  )
  const money = replyQueue(db, appIds).filter(
    (entry) =>
      entry.label?.moneyInvolved && !posted.has(`${entry.review.store}:${entry.review.storeReviewId}`),
  )
  const name = (id: string) => causes.find((cause) => cause.id === id)?.label ?? id
  return {
    newReviews,
    shareAnswered: overview.shareAnswered,
    topCauses: overview.topCauses.map((top) => ({ ...top, label: name(top.cause) })),
    spikes: {
      weekly: weeklySpikes.filter((spike) => spike.week === overview.week),
      versions: versionSpikes.slice(0, 1),
    },
    moneyWaiting: {
      count: money.length,
      newest: money
        .toSorted((a, b) => b.review.at.localeCompare(a.review.at))
        .slice(0, 5)
        .map(({ review, label }) => ({
          store: review.store,
          storeReviewId: review.storeReviewId,
          stars: review.stars,
          cause: label?.cause ?? null,
          excerpt: excerpt(review.text),
        })),
    },
  }
}

const excerpt = (text: string) => {
  const chars = Array.from(text.replace(/\s+/g, " ").trim())
  return chars.length <= 120 ? chars.join("") : `${chars.slice(0, 117).join("")}...`
}

const percent = (share: number) => `${(share * 100).toFixed(0)}%`

/** The summary as the email's plain text. */
export function formatDaily(summary: DailySummary, causes: readonly Cause[]): string {
  const name = (id: string | null) =>
    id ? (causes.find((cause) => cause.id === id)?.label ?? id) : "not sorted"
  const { weekly, versions } = summary.spikes
  return [
    `New reviews since yesterday: ${String(summary.newReviews)}`,
    `Answered this week: ${summary.shareAnswered === null ? "the stores don't say" : percent(summary.shareAnswered)}`,
    `Top causes this week: ${summary.topCauses.map((top) => `${top.label} (${String(top.count)})`).join(", ") || "none yet"}`,
    `Spikes: ${
      [
        ...weekly.map(
          (spike) =>
            `${name(spike.cause)}, ${String(spike.count)} this week against ${spike.previousAverage.toFixed(1)} a week before`,
        ),
        ...versions.map(
          (spike) =>
            `crashes in version ${spike.version}, ${percent(spike.crashShare)} against ${percent(spike.previousCrashShare)} in ${spike.previousVersion}`,
        ),
      ].join("; ") || "none"
    }`,
    `Money complaints still waiting for a reply: ${String(summary.moneyWaiting.count)}`,
    ...summary.moneyWaiting.newest.map(
      (entry) => `  ${"★".repeat(entry.stars)} ${name(entry.cause)}: ${entry.excerpt}`,
    ),
  ].join("\n")
}
