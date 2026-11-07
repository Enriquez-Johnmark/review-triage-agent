import { Link } from "react-router"

import type { CauseName, ReviewEntry } from "@/api/types"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { causeName, percent, shortDate, stars } from "@/lib/format"

export const LANGUAGE: Record<string, string> = {
  english: "English",
  tagalog: "Tagalog",
  taglish: "Taglish",
}

export const DRAFT_STATUS: Record<string, string> = {
  ready: "Draft ready",
  flagged: "Breaks a rule",
  approved: "Approved",
  refused: "Refused",
  posted: "Posted",
}

/** Reviews in a table, each linking to its own page. */
export function ReviewTable({
  entries,
  causes,
}: {
  entries: readonly ReviewEntry[]
  causes: readonly CauseName[]
}) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No reviews here.</p>
  return (
    <>
      {/* On a phone: one card per review. */}
      <ul className="space-y-3 md:hidden">
        {entries.map((entry) => (
          <li
            key={`${entry.review.store}:${entry.review.storeReviewId}`}
            className="rounded-lg border p-3"
          >
            <div className="flex justify-between text-sm text-muted-foreground">
              <span aria-label={`${entry.review.stars} stars`}>{stars(entry.review.stars)}</span>
              <span>{shortDate(entry.review.at)}</span>
            </div>
            <Link className="my-2 line-clamp-3 block hover:underline" to={reviewLink(entry)}>
              {entry.review.text || "(no text)"}
            </Link>
            <Labels entry={entry} causes={causes} />
            <p className="mt-2 text-xs text-muted-foreground">{replyStatus(entry)}</p>
          </li>
        ))}
      </ul>
      <Table className="hidden md:table">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Stars</TableHead>
            <TableHead className="w-1/2">Review</TableHead>
            <TableHead>Cause</TableHead>
            <TableHead>Reply</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(({ review, label, draftStatus }) => (
            <TableRow key={`${review.store}:${review.storeReviewId}`}>
              <TableCell className="whitespace-nowrap">{shortDate(review.at)}</TableCell>
              <TableCell className="whitespace-nowrap" aria-label={`${review.stars} stars`}>
                {stars(review.stars)}
              </TableCell>
              <TableCell className="max-w-0 whitespace-normal">
                <Link className="line-clamp-2 hover:underline" to={reviewLink({ review })}>
                  {review.text || "(no text)"}
                </Link>
              </TableCell>
              <TableCell>
                <Labels entry={{ review, label, draftStatus }} causes={causes} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {replyStatus({ review, draftStatus })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

const reviewLink = ({ review }: Pick<ReviewEntry, "review">) =>
  `/reviews/${review.store}/${encodeURIComponent(review.storeReviewId)}`

const replyStatus = ({ review, draftStatus }: Pick<ReviewEntry, "review" | "draftStatus">) =>
  draftStatus ? DRAFT_STATUS[draftStatus] : review.companyReplied ? "Answered" : "—"

/** A review's cause, language, money flag and confidence. */
function Labels({
  entry: { label },
  causes,
}: {
  entry: ReviewEntry
  causes: readonly CauseName[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant={label?.cause ? "secondary" : "warning"}>
        {label ? causeName(causes, label.cause) : "Not sorted yet"}
      </Badge>
      {label?.language && <Badge variant="outline">{LANGUAGE[label.language]}</Badge>}
      {label?.moneyInvolved && <Badge variant="destructive">Money</Badge>}
      {label?.confidence !== undefined && label.setBy === "model" && (
        <span className="text-xs text-muted-foreground">{percent(label.confidence)}</span>
      )}
    </div>
  )
}
